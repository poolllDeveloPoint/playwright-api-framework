# 📋 ArticleHub API Master Test Plan & QA Strategy

**Document Reference**: `ATP-ARTICLEHUB-001`  
**Author**: Senior Software Development Engineer in Test (SDET)  
**System Under Test (SUT)**: ArticleHub Companion REST API (Express.js + TypeScript + PostgreSQL + Redis)  
**Test Automation Platform**: Playwright Test (TypeScript)  
**Requirements Baseline**: [server/API_REQUIREMENTS.md](server/API_REQUIREMENTS.md)  

---

## 1. Executive Summary & Purpose

This Master Test Plan establishes the **Quality Engineering Strategy**, **Test Architecture**, and **Traceability Framework** for the ArticleHub API automation repository. 

Rather than treating the target API as an opaque black box, this strategy implements a **Hybrid Grey-Box Quality Assurance Paradigm**. It combines standard HTTP contract validation with direct database state inspection (*Direct DB Assertion*), caching lifecycle verification (*Redis Cache Invalidation & TTL Inspection*), and server-side session revocation (*JWT Revocation Blocklist*).

---

## 2. Scope of Testing

### 2.1 In-Scope Capabilities
- **API Contract & Schema Compliance**: JSON Schema validation with AJV against OpenAPI 3.0 specifications.
- **Identity & Access Management (IAM)**:
  - User authentication and JWT issuance (`REQ-AUTH-01`).
  - Bearer/Token authorization header enforcement on protected endpoints (`REQ-AUTH-02`).
  - Server-side token revocation and Redis blocklist verification (`REQ-AUTH-03`).
- **Input Validation & Boundary Testing**:
  - Registration boundary testing on username lengths using Boundary Value Analysis (BVA) (`REQ-USR-01`, `REQ-USR-02`).
- **Content & Publication Lifecycle**:
  - Article CRUD workflows (`REQ-ART-01` – `REQ-ART-04`).
  - State Transition Testing for Draft Isolation and Publication Workflows (`REQ-ART-05`).
- **Performance & Data Freshness (Caching Layer)**:
  - Cache MISS on cold request, Cache HIT on repeat query (`REQ-CACHE-01`).
  - Automated cache eviction upon data mutation (`REQ-CACHE-02`).
- **Data Persistence & Relational Integrity**:
  - Direct PostgreSQL table queries verifying persistent state, cascade deletions, and foreign-key integrity (`REQ-DB-01`).
  - ISO-8601 temporal standards compliance (`REQ-DB-02`).
- **Taxonomy**:
  - Global tag collection contract compliance (`REQ-TAG-01`).

### 2.2 Out-of-Scope
- Stress and High-Volume Load Testing (dedicated k6 / Gatling suites).
- Network penetration testing and DDoS mitigation.
- Third-party OAuth identity providers.

---

## 3. Test Levels & Testing Taxonomy

The framework implements a four-tiered testing hierarchy:

```text
┌────────────────────────────────────────────────────────┐
│           Level 4: Grey-Box Integration Tests          │
│   (Direct DB State, Redis Cache Invalidation, Logout)  │
├────────────────────────────────────────────────────────┤
│           Level 3: Negative & Boundary Testing         │
│         (Username Boundary Matrix: 2, 3, 20, 26 chars) │
├────────────────────────────────────────────────────────┤
│           Level 2: API Smoke & Functional Flows        │
│          (Article CRUD, Pagination, Feed Filtering)    │
├────────────────────────────────────────────────────────┤
│           Level 1: Contract & JSON Schema Tests        │
│          (AJV Validation for Request/Response Schemas) │
└────────────────────────────────────────────────────────┘
```

### Level 1: Contract & JSON Schema Testing
- **Objective**: Validate syntactic and semantic compliance of API responses against predefined JSON Schemas.
- **Tools**: AJV (`ajv`, `ajv-formats`).
- **Implementation**: Handled via `custom-expect.ts` using `.shouldValidateSchema(dirName, fileName)`.

### Level 2: API Smoke & Functional Testing
- **Objective**: Verify that primary happy-path business flows function correctly from end to end.
- **Specification**: [`tests/api/smokeTest.spec.ts`](tests/api/smokeTest.spec.ts).

### Level 3: Negative & Boundary Matrix Testing
- **Objective**: Ensure the system rejects invalid inputs with accurate HTTP error codes and descriptive messages.
- **Technique**: Boundary Value Analysis (BVA) applied to username character lengths ($n - 1$, $n$, $m$, $m + 1$).
- **Specification**: [`tests/api/negativeTest.spec.ts`](tests/api/negativeTest.spec.ts).

### Level 4: Grey-Box Integration Testing
- **Objective**: Verify that HTTP mutations are correctly reflected in downstream stateful services (PostgreSQL and Redis).
- **Specification**: [`tests/api/cacheAndDb.spec.ts`](tests/api/cacheAndDb.spec.ts).

---

## 4. Test Design Techniques Applied

| Test Design Technique | Target Feature | Applied Test Scenario |
| :--- | :--- | :--- |
| **Boundary Value Analysis (BVA)** | Username Validation (`REQ-USR-02`) | Tested boundary inputs: `2 chars` (Reject), `3 chars` (Accept Min), `20 chars` (Accept Max), `26 chars` (Reject). |
| **State Transition Testing** | Article Publication (`REQ-ART-05`) | `Created (Draft)` $\to$ `Public Access (404)` $\to$ `Author View (200)` $\to$ `POST /publish` $\to$ `Public Access (200)`. |
| **Equivalence Partitioning (EP)** | Authentication & Security (`REQ-AUTH-02`, `REQ-AUTH-03`) | Partitions: Valid Token (200), Revoked Token (401), Omitted Token (401), Malformed Token (401). |
| **Cache Mutation Lifecycle** | Redis Tier (`REQ-CACHE-01`, `REQ-CACHE-02`) | Sequence: Cold Request (MISS) $\to$ Warm Request (HIT) $\to$ Mutation (Eviction) $\to$ Cold Request (MISS). |
| **Direct Persistence Audit** | PostgreSQL Integrity (`REQ-DB-01`) | Direct SQL query assertion comparing HTTP payload with relational table rows and foreign keys. |

---

## 5. Test Data Management & Isolation Strategy

1. **Native TypeScript Migrations & Seeders**:
   - Schema defined via native TypeScript DDL (`server/src/db/migrations/`).
   - Initial fixtures seeded programmatically (`server/src/db/seeders/`).
   - Clean reset supported via `npm run db:reset`.
2. **Per-Test Data Isolation**:
   - Articles generated with randomized titles and millisecond timestamps using `@faker-js/faker` to eliminate collision risks.
   - Mutated or created articles are purged via automated teardown blocks in `finally` / `deleteRequest()`.
3. **Redis State Cleanliness**:
   - `RedisHelper.flushArticles()` invoked before test scenarios to ensure deterministic cold-cache states.

---

## 6. Execution & Infrastructure Architecture

### 6.1 Zero-Touch & Self-Healing Test Orchestration
The test framework is designed to be completely autonomous:
- **`webServer` Automation ([`playwright.config.ts`](playwright.config.ts))**: Automatically detects if the companion stack is running; if not, triggers `docker compose up` in `__dirname`.
- **Self-Healing Test Fixture ([`utils/server-check.ts`](utils/server-check.ts))**: Performs a fast probe (1ms) before test execution. If backend services were manually stopped (`docker down`), it auto-recovers the containers, waits for health checks, and resumes without failing tests.

### 6.2 Execution Projects
Configured in [`playwright.config.ts`](playwright.config.ts):
- `api-smoke-tests`: Executes `smokeTest.spec.ts`, `negativeTest.spec.ts`, and `cacheAndDb.spec.ts`.
- `api-testing`: Master regression suite including worker dependencies.

---

## 7. Requirements Traceability Matrix (RTM)

This matrix maps functional requirements to their automated test coverage:

| Req ID | Category | Business Requirement | Test Specification | Verification Scope | Status |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **`REQ-AUTH-01`** | Auth | User login & JWT issuance | `smokeTest.spec.ts`<br>`cacheAndDb.spec.ts` | Status 200, JWT token structure, user object schema | **Covered** |
| **`REQ-AUTH-02`** | Security | Protected endpoint access control | `smokeTest.spec.ts`<br>`cacheAndDb.spec.ts` | Rejection of unauthenticated/invalid requests | **Covered** |
| **`REQ-AUTH-03`** | Session | Token revocation via Redis blocklist | `cacheAndDb.spec.ts` | Logout 200, Redis blocklist key check, 401 on reuse | **Covered** |
| **`REQ-USR-01`** | Account | User registration | `negativeTest.spec.ts` | Input validation and account provisioning rules | **Covered** |
| **`REQ-USR-02`** | Validation | Username boundary matrix (3–20) | `negativeTest.spec.ts` | BVA evaluation: 2, 3, 20, 26 characters | **Covered** |
| **`REQ-ART-01`** | Content | Paginated feed retrieval | `smokeTest.spec.ts` | Limit/offset pagination, schema validation | **Covered** |
| **`REQ-ART-02`** | Content | Article creation & slug generation | `smokeTest.spec.ts`<br>`cacheAndDb.spec.ts` | 201 Created, auto-slug generation, default draft | **Covered** |
| **`REQ-ART-03`** | Content | Article modification (`PUT`) | `smokeTest.spec.ts` | 200 OK, title/slug update, updatedAt timestamp | **Covered** |
| **`REQ-ART-04`** | Content | Article deletion (`DELETE`) | `smokeTest.spec.ts`<br>`cacheAndDb.spec.ts` | 204 No Content, permanent purge in database | **Covered** |
| **`REQ-ART-05`** | Visibility | Draft isolation & publish workflow | `cacheAndDb.spec.ts` | Draft hidden from public (404), author view (200), publish to public feed | **Covered** |
| **`REQ-CACHE-01`**| Cache | Redis cache MISS & HIT lifecycle | `cacheAndDb.spec.ts` | `X-Cache: MISS` cold read, `X-Cache: HIT` warm read | **Covered** |
| **`REQ-CACHE-02`**| Cache | Invalidation on data mutation | `cacheAndDb.spec.ts` | Cache eviction on article POST, subsequent MISS | **Covered** |
| **`REQ-DB-01`** | Database | Relational integrity & direct SQL | `cacheAndDb.spec.ts` | Direct SELECT query asserting fields & author FK | **Covered** |
| **`REQ-DB-02`** | Database | ISO-8601 temporal standards | `smokeTest.spec.ts` | Schema format `date-time` validation | **Covered** |
| **`REQ-TAG-01`** | Taxonomy | Global tag collection retrieval | `smokeTest.spec.ts` | 200 OK, array format, contract schema | **Covered** |

---

## 8. Defect Severity & Pass/Fail Criteria

### 8.1 Acceptance Gates (Exit Criteria)
1. **Pass Rate**: 100% of all Level 1 through Level 4 test cases must pass.
2. **Zero Schema Regressions**: No schema drift against OpenAPI contract specs.
3. **Database Consistency**: Direct queries must reflect zero orphaned records and verify clean row purges.
4. **Cache Freshness**: 0 stale reads following mutating operations.

### 8.2 Defect Severity Classification
- **Critical (P0)**: Data loss, security bypass, unauthorized access to author drafts, token revocation failure.
- **Major (P1)**: Cache eviction failure resulting in stale public feeds, pagination calculation errors.
- **Minor (P2)**: Non-compliant error message wording, minor timestamp formatting deviations.
