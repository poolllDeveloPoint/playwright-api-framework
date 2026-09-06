# 🚀 ArticleHub Full-Stack Test Automation Framework (API & UI E2E)

An enterprise-grade **Full-Stack Test Automation & SDET Portfolio Framework** built with **Playwright (TypeScript)**, featuring a companion **Express.js API Server**, a decoupled **Web Client SPA**, **PostgreSQL** database persistence, and a **Redis** caching tier.

Designed to demonstrate advanced Software Development Engineer in Test (SDET) practices: REST API contract testing, negative boundary matrix validation, direct database assertions, Redis cache lifecycle verification, draft visibility isolation, and end-to-end browser UI automation.

---

## 🌟 Architectural Highlights

Most automation portfolios test third-party endpoints as black boxes. This framework takes a **hybrid full-stack approach** by embedding an end-to-end companion application stack:

- **Dual-Hybrid Running Mode**:
  - **Mode 1 (Reviewer All-in-One)**: Run the entire backend system (PostgreSQL, Redis, Express API Server, Swagger UI) inside Docker with a single command (`npm run docker:up`).
  - **Mode 2 (Developer Mode)**: Run infra via Docker (`npm run docker:infra`) and run the API server on host (`npm run start:server`) with live SQL query and cache hit/miss streaming.
- **Decoupled Lightweight Web Client (`web/`)**:
  - A fast, zero-dependency modern Single-Page Application (SPA) running at `http://localhost:3002`.
  - Built with Vanilla ES Modules and modern dark-mode CSS to serve as an authentic, production-grade target web application for manual exploratory and automated testing.
- **End-to-End Browser UI Automation (`tests/ui/`)**:
  - Automated user journeys in Chromium covering authentication, article authoring, real-time toast feedback, browser confirmation dialogs (`dialog.accept()`), draft publication, and permanent deletion.
  - State isolation testing ensuring un-published draft articles remain invisible to unauthenticated public visitors.
- **Native TypeScript Migrations & Seeders**: Zero heavy ORM bloat; schema and initial test fixtures are managed cleanly with pure TypeScript runners (`server/src/db/`).
- **Interactive Swagger UI (OpenAPI 3.0)**: Exploratory manual API testing at `http://localhost:3001/api-docs`.
- **Advanced Backend Testing Capabilities**:
  - **Contract & JSON Schema Validation**: Automated schema checks using `ajv`.
  - **Negative Boundary Validation Matrix**: Strict boundary testing on username length constraints (3 - 20 chars).
  - **Direct Database Assertions**: Verifying persistent database state against PostgreSQL tables via direct relational queries.
  - **Redis Cache Validation**: Asserting cache hits (`X-Cache: HIT`), misses (`X-Cache: MISS`), and automatic cache eviction upon data mutations (`REQ-CACHE-02`).
- **Requirements Traceability**: Every test case links directly to functional specifications in [server/API_REQUIREMENTS.md](server/API_REQUIREMENTS.md).

---

## 🏗️ Architecture Diagram

```text
┌────────────────────────────────────────────────────────────────────────┐
│                   Playwright Test Automation Runner                    │
│   (API Smoke, Negative Boundaries, Schema, Direct DB & Redis Cache)    │
│   (E2E Browser UI Automation: Auth, Publication & Draft Isolation)     │
└───────────────┬───────────────────────────────┬────────────────────────┘
                │ Browser (Chromium)            │ HTTP / REST API
                ▼                               ▼
┌───────────────────────────────┐  ┌─────────────────────────────────────┐
│  ArticleHub Web Client (SPA)  │  │    ArticleHub Express API Server    │
│  (Port 3002 - Lightweight UI) ├──┼──► (Port 3001 - Swagger OpenAPI UI) │
└───────────────────────────────┘  └──────┬───────────────────────┬───────┘
                                          │                       │ Direct Query
                                          ▼                       ▼
                           ┌───────────────────────────┐ ┌───────────────┐
                           │      Redis Cache Tier     │ │   PostgreSQL  │
                           │      (Port 6380)          │ │   (Port 5432) │
                           └───────────────────────────┘ └───────────────┘
```

---

## 📋 Requirements Traceability Matrix

All requirements are documented in [server/API_REQUIREMENTS.md](server/API_REQUIREMENTS.md):

| Requirement ID | Category | Description | Test Specification |
| :--- | :--- | :--- | :--- |
| `REQ-AUTH-01` | Authentication | User authentication & JWT token issuance | `tests/api/smokeTest.spec.ts`, `tests/ui/smokeUITest.spec.ts` |
| `REQ-AUTH-02` | Authentication | Endpoint protection via `Token <jwt>` | `tests/api/smokeTest.spec.ts` |
| `REQ-AUTH-03` | Authentication | User logout & server-side token revocation via Redis | `tests/api/cacheAndDb.spec.ts`, `tests/ui/smokeUITest.spec.ts` |
| `REQ-USR-01` | User Validation | New user registration | `tests/api/smokeTest.spec.ts` |
| `REQ-USR-02` | User Validation | Username boundary matrix validation (3 - 20 chars) | `tests/api/negativeTest.spec.ts` |
| `REQ-ART-01` | Article Feed | Paginated feed retrieval & JSON schema validation | `tests/api/smokeTest.spec.ts` |
| `REQ-ART-02` | Article Lifecycle | Article creation with unique slug generation | `tests/api/smokeTest.spec.ts`, `tests/ui/smokeUITest.spec.ts` |
| `REQ-ART-03` | Article Lifecycle | Article update (`PUT /articles/:slug`) | `tests/api/smokeTest.spec.ts` |
| `REQ-ART-04` | Article Lifecycle | Article deletion (`DELETE /articles/:slug`) | `tests/api/smokeTest.spec.ts`, `tests/ui/smokeUITest.spec.ts` |
| `REQ-ART-05` | Access Control | Draft visibility isolation & publication workflow | `tests/api/cacheAndDb.spec.ts`, `tests/ui/smokeUITest.spec.ts` |
| `REQ-CACHE-01` | Redis Caching | Cache MISS on cold request, Cache HIT on repeat | `tests/api/cacheAndDb.spec.ts` |
| `REQ-CACHE-02` | Cache Eviction | Cache invalidation triggered by article mutation | `tests/api/cacheAndDb.spec.ts` |
| `REQ-DB-01` | DB Integrity | Direct SQL query verification on PostgreSQL tables | `tests/api/cacheAndDb.spec.ts` |
| `REQ-TAG-01` | Tags | Tag collection contract validation | `tests/api/smokeTest.spec.ts` |

---

## ⚡ Quickstart Guide

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [Docker](https://www.docker.com/) & Docker Compose

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/poolllDeveloPoint/playwright-api-framework.git
cd playwright-api-framework
npm install
```

### 2. Start the Backend Stack (1-Command Reviewer Quickstart)
```bash
npm run docker:up
```
> 💡 *This starts PostgreSQL (`5432`), Redis (`6380`), the API Server (`3001`), and Swagger UI at [http://localhost:3001/api-docs](http://localhost:3001/api-docs).*
> ⚡ *Zero-Touch Automation: If the server is not running, Playwright's `webServer` block will automatically spin up the Docker services during test execution!*

### 3. Start the Web Client (Optional Exploratory UI)
```bash
npm run start:web
```
> 🌐 *Access the modern ArticleHub web client at [http://localhost:3002](http://localhost:3002).*

### 4. Run Automated Tests
```bash
# Run all API smoke & contract test suites
npm run test:smoke

# Run DB persistence, Redis cache lifecycle & logout revocation integration tests
npm run test:integration

# Run End-to-End Browser UI Smoke Tests (Auth, Draft Isolation, Deletion)
npm run test:ui:smoke

# Or run specific test specs
npx playwright test tests/api/smokeTest.spec.ts
npx playwright test tests/api/negativeTest.spec.ts
npx playwright test tests/api/cacheAndDb.spec.ts
npx playwright test tests/ui/smokeUITest.spec.ts
```

### 5. View Test Reports
```bash
npx playwright show-report
```

---

## 🛠️ Essential NPM Scripts

| Command | Purpose |
| :--- | :--- |
| `npm run docker:up` | Starts all backend services in Docker (PostgreSQL, Redis, API, Swagger) |
| `npm run docker:down` | Stops all Docker containers and removes networks |
| `npm run docker:status` | Checks status, uptime, health, and ports of all project Docker containers |
| `npm run docker:infra` | Starts only PostgreSQL and Redis (for host development mode) |
| `npm run docker:logs:api` | Streams real-time SQL queries and HTTP logs from the API container |
| `npm run start:server` | Starts API server on host (Port 3001) |
| `npm run start:server:watch` | Starts API server on host with auto-reload on file changes |
| `npm run start:web` | Starts the lightweight Web Client SPA on host (Port 3002) |
| `npm run db:migrate` | Runs pending database schema migrations |
| `npm run db:rollback` | Reverts the latest batch of migrations |
| `npm run db:seed` | Seeds test fixtures (default user & sample articles) |
| `npm run db:reset` | Truncates all tables and re-seeds clean test data |
| `npm run db:psql` | Opens interactive PostgreSQL CLI terminal (`psql`) |
| `npm run redis:cli` | Opens interactive Redis CLI terminal (`redis-cli`) |
| `npm test` | Runs complete Playwright test suite |
| `npm run test:smoke` | Runs all API smoke tests (smoke, negative boundaries, and cache/db) |
| `npm run test:integration` | Runs Redis cache, DB persistence, draft/publish, and logout integration tests |
| `npm run test:ui:smoke` | Runs End-to-End Browser UI smoke tests in Chromium |migrations |
| `npm run db:rollback` | Reverts the latest batch of migrations |
| `npm run db:seed` | Seeds test fixtures (default user & sample articles) |
| `npm run db:reset` | Truncates all tables and re-seeds clean test data |
| `npm run db:psql` | Opens interactive PostgreSQL CLI terminal (`psql`) |
| `npm run redis:cli` | Opens interactive Redis CLI terminal (`redis-cli`) |
| `npm test` | Runs complete Playwright test suite |
| `npm run test:smoke` | Runs all API smoke tests (13 test cases across smoke, negative, and cache/db) |
| `npm run test:integration` | Runs Redis cache, DB persistence, draft/publish, and logout integration tests |

---

## 🔍 Interactive Debugging & Verification

### 1. Docker Container Status & Health Monitoring
To inspect the status, uptime, and health of all backend containers (`playwright-framework-api`, `playwright-framework-postgres`, `playwright-framework-redis`):

```bash
# Shortcut via npm
npm run docker:status

# Or native Docker Compose command
docker compose ps
```

Example Output:
```text
NAME                            IMAGE                          COMMAND                  SERVICE    STATUS                   PORTS
playwright-framework-api        playwright-api-framework-api   "docker-entrypoint.s…"   api        Up 5 minutes             0.0.0.0:3001->3001/tcp
playwright-framework-postgres   postgres:16-alpine             "docker-entrypoint.s…"   postgres   Up 5 minutes (healthy)   0.0.0.0:5432->5432/tcp
playwright-framework-redis      redis:7-alpine                 "docker-entrypoint.s…"   redis      Up 5 minutes (healthy)   0.0.0.0:6380->6379/tcp
```

**Additional Docker diagnostic commands:**
- **Inspect Live Resource Usage (CPU & Memory):**
  ```bash
  docker stats playwright-framework-api playwright-framework-postgres playwright-framework-redis --no-stream
  ```
- **Inspect Specific Service Logs:**
  ```bash
  docker compose logs api        # API server logs
  docker compose logs postgres   # Database logs
  docker compose logs redis      # Redis cache logs
  ```
- **Quick Health Check Probe via HTTP:**
  ```bash
  curl -i http://localhost:3001/api/tags
  ```

### 2. Swagger UI Exploratory Testing
Open **[http://localhost:3001/api-docs](http://localhost:3001/api-docs)** in your browser:
- Log in via `POST /users/login` using `imtester@mail.com` / `imtester123`.
- Click the green **Authorize** button at the top and enter `Token <jwt_token>`.
- Test creating drafts (`POST /articles`), reading public vs author feeds (`GET /articles`), and publishing (`POST /articles/{slug}/publish`).

### 3. Live SQL Query & Redis Cache Logs
View database queries and cache diagnostics in real time:
```bash
npm run docker:logs:api
```
Output example:
```text
[Articles List] Requester: Public (Unauthenticated)
[SQL Query] SELECT a.*, u.username as author_username, u.bio as author_bio FROM articles a JOIN users u ON a.author_id = u.id WHERE a.published = true ORDER BY a.created_at DESC LIMIT $1 OFFSET $2
  └─ Params: [10,0] | Duration: 4ms | Rows: 10
[Redis Cache MISS] articles:list:public:10:0:all:all (fetched from DB & cached 60s)
GET /api/articles?limit=10&offset=0 200 (18ms)
```

### 4. Database State Verification (psql)
```bash
npm run db:psql
```
```sql
SELECT id, slug, title, published, author_id FROM articles ORDER BY id DESC LIMIT 5;
```

### 5. Redis Cache Verification (redis-cli)
```bash
npm run redis:cli
```
```text
KEYS articles:*
GET "articles:list:public:10:0:all:all"
```

---

## 📁 Repository Structure

```text
├── helpers/               # Test utility functions & token loaders
├── request-object/        # Request payload builders & factories
├── response-schemas/      # JSON Schema definitions for contract testing (ajv)
├── server/                # Companion ArticleHub Mock API Server
│   ├── src/
│   │   ├── db/            # Native TypeScript migrations & seeders
│   │   ├── middleware/    # JWT Authentication & authorization middleware
│   │   ├── routes/        # REST API endpoints (articles, auth, tags)
│   │   ├── redis.ts       # Redis client & cache invalidation logic
│   │   ├── swagger.yaml   # OpenAPI 3.0 specification
│   │   └── index.ts       # Express application entrypoint
│   ├── API_REQUIREMENTS.md# Single Source of Truth: Functional & Business Rules
│   ├── Dockerfile         # Node.js 20 Alpine container definition
│   └── README.md          # Standalone server operational guide
├── web/                   # Lightweight Companion Web Client (SPA)
│   ├── css/
│   │   └── style.css      # Modern dark-theme stylesheet
│   ├── js/
│   │   ├── api.js         # API Fetch client wrapper & cache diagnostic tracker
│   │   ├── state.js       # Reactive client-side application state store
│   │   ├── ui.js          # DOM component renderers, toasts & modal dialogs
│   │   └── app.js         # Application controller, forms & user action handlers
│   ├── index.html         # Application semantic entrypoint
│   └── serve.js           # Ultra-lightweight static file server (Port 3002)
├── tests/
│   ├── api/               # API Playwright test specs (smoke, negative, schema, db, cache)
│   └── ui/                # End-to-End Browser UI test specs (smoke, draft isolation, deletion)
├── docker-compose.yml     # Container orchestration (postgres, redis, api)
├── playwright.config.ts   # Playwright multi-project configuration
└── package.json           # Scripts & project dependencies
```

---

## 📄 Documentation Links
- **[Master Test Plan & QA Strategy](TEST_PLAN.md)**
- **[Functional Specifications & Acceptance Criteria](server/API_REQUIREMENTS.md)**
- **[Companion Server Operational Guide](server/README.md)**
