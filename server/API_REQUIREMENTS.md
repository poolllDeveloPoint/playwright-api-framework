# ArticleHub API Requirements & Functional Specifications

This document defines the **Functional Requirements**, **Business Rules**, and **Acceptance Criteria** for the ArticleHub API. It serves as the authoritative **Single Source of Truth (SSOT)** for backend service implementation, API contract compliance, data integrity, and system behavior.

---

## Requirements Registry

Each requirement is assigned a unique, immutable **Requirement ID** representing a distinct functional capability or business rule.

| Category | Requirement ID | Feature Description | Functional Scope |
| :--- | :--- | :--- | :--- |
| **Authentication** | `REQ-AUTH-01` | User authentication & JWT token issuance | Identity & Session |
| | `REQ-AUTH-02` | Protected endpoint access control via `Token <jwt>` | API Security |
| | `REQ-AUTH-03` | User logout & server-side token revocation via Redis | Session Termination |
| **User Management** | `REQ-USR-01` | New user account registration | Account Provisioning |
| | `REQ-USR-02` | Username character length boundary constraints (3 - 20 chars) | Input Validation |
| **Article Management** | `REQ-ART-01` | Paginated article feed retrieval | Content Delivery |
| | `REQ-ART-02` | Article creation with unique slug generation | Content Ingestion |
| | `REQ-ART-03` | Article modification (`PUT /articles/:slug`) | Content Mutation |
| | `REQ-ART-04` | Article deletion (`DELETE /articles/:slug`) | Content Removal |
| | `REQ-ART-05` | Draft lifecycle, publication workflow, and visibility isolation | Access & Visibility |
| **Caching Layer** | `REQ-CACHE-01` | In-memory response caching with `X-Cache` diagnostic header | Performance Optimization |
| | `REQ-CACHE-02` | Automated cache eviction on data mutation | Data Freshness |
| **Data Persistence** | `REQ-DB-01` | Relational integrity and persistence in PostgreSQL | Database Integrity |
| | `REQ-DB-02` | ISO-8601 UTC timestamp standard for temporal fields | Schema Standard |
| **Taxonomy & Tags** | `REQ-TAG-01` | Global tag collection retrieval | Metadata Discovery |

---

## Detailed Functional Specifications

### 1. Authentication Module (`REQ-AUTH`)

#### `REQ-AUTH-01`: User Login
- **Endpoint**: `POST /api/users/login`
- **Request Body**:
  ```json
  {
    "user": {
      "email": "string (valid registered email)",
      "password": "string"
    }
  }
  ```
- **Acceptance Criteria**:
  1. If email and password match registered credentials, the server **must** return HTTP `200 OK`.
  2. The response body **must** return a `user` object containing `email`, `token` (signed JWT string), `username`, `bio`, and `image`.
  3. If credentials do not match or the user is not found, the server **must** return HTTP `401 Unauthorized` with body:
     ```json
     {
       "errors": {
         "email or password": ["is invalid"]
       }
     }
     ```

#### `REQ-AUTH-02`: Authorization Header Validation
- **Acceptance Criteria**:
  1. Protected endpoints (`POST /articles`, `PUT /articles/:slug`, `DELETE /articles/:slug`, `POST /articles/:slug/publish`, `POST /users/logout`) **require** an authorization header in the format:
     ```text
     Authorization: Token <jwt_token>
     ```
     *(The format `Bearer <jwt_token>` is also supported for backward compatibility).*
  2. If the authorization header is omitted, malformed, or contains an invalid/expired token, the server **must** return HTTP `401 Unauthorized`.

#### `REQ-AUTH-03`: User Logout & Server-Side Token Revocation
- **Endpoint**: `POST /api/users/logout` (Auth Required)
- **Header**:
  ```text
  Authorization: Token <jwt_token>
  ```
- **Business Rule & Invalidation Mechanism**:
  1. The server invalidates the JWT server-side by adding it to the Redis token revocation blocklist (`token:blocklist:<token>`) with a TTL matching the token's remaining lifetime (`exp - now`).
  2. Once revoked, the token cannot be used to authenticate any subsequent requests.
- **Acceptance Criteria**:
  1. Returns HTTP `200 OK` with response body:
     ```json
     {
       "message": "Successfully logged out"
     }
     ```
  2. Any subsequent request to protected endpoints (`POST /articles`, `PUT /articles/:slug`, `DELETE /articles/:slug`, `POST /articles/:slug/publish`) using the revoked token **must** return HTTP `401 Unauthorized` with:
     ```json
     {
       "errors": {
         "authorization": ["token has been revoked"]
       }
     }
     ```
  3. Requests to `GET /api/articles` with a revoked token **must** gracefully fallback to unauthenticated public behavior (hiding author drafts).
  4. Calling `POST /api/users/logout` without an authorization header or with an already-revoked token **must** return HTTP `401 Unauthorized`.

---

### 2. User Management Module (`REQ-USR`)

#### `REQ-USR-01`: User Registration
- **Endpoint**: `POST /api/users`
- **Request Body**:
  ```json
  {
    "user": {
      "username": "string (required, 3-20 chars)",
      "email": "string (required, unique email)",
      "password": "string (required)"
    }
  }
  ```
- **Acceptance Criteria**:
  1. Returns HTTP `201 Created` upon successful registration.
  2. Returns the newly created `user` object with a valid JWT `token`.
  3. Prevents duplicate registrations with the same email or username (returns HTTP `422 Unprocessable Entity`).

#### `REQ-USR-02`: Username Length Boundary Constraints
- **Endpoint**: `POST /api/users`
- **Business Rule**:
  - `username` **must be between 3 and 20 characters** (inclusive).
- **Validation Rules**:
  | Username Input | Length | Expected HTTP Status | Expected Validation Response |
  | :--- | :--- | :--- | :--- |
  | `"im"` | 2 chars | `422 Unprocessable Entity` | `{ "errors": { "username": ["is too short (minimum is 3 characters)"] } }` |
  | `"imb"` | 3 chars | *Passes username check* | Accepted boundary value |
  | `"imtesterwithlengthus"` | 20 chars | *Passes username check* | Accepted boundary value |
  | `"imtesterwithlengthusername"` | 26 chars | `422 Unprocessable Entity` | `{ "errors": { "username": ["is too long (maximum is 20 characters)"] } }` |

---

### 3. Article Management Module (`REQ-ART`)

#### `REQ-ART-01`: List Articles & Pagination
- **Endpoint**: `GET /api/articles`
- **Query Parameters**:
  - `limit` (integer, default: 20): Maximum number of articles returned.
  - `offset` (integer, default: 0): Pagination offset.
  - `tag` (string, optional): Filter articles by tag.
  - `author` (string, optional): Filter articles by author username.
- **Acceptance Criteria**:
  1. Returns HTTP `200 OK`.
  2. Response body contains an `articles` array and an `articlesCount` integer.
  3. Articles are ordered in descending order by `createdAt` (newest first).

#### `REQ-ART-02`: Create Article & Slug Generation
- **Endpoint**: `POST /api/articles` (Auth Required)
- **Request Body**:
  ```json
  {
    "article": {
      "title": "string (required)",
      "description": "string (required)",
      "body": "string (required)",
      "tagList": ["string"] (optional),
      "published": false (optional boolean, default: false)
    }
  }
  ```
- **Acceptance Criteria**:
  1. Returns HTTP `201 Created`.
  2. The server automatically creates a unique `slug` derived from the `title` plus a millisecond timestamp suffix.
  3. `favorited` defaults to `false` and `favoritesCount` defaults to `0`.
  4. The `author` field is automatically populated with the profile of the authenticated user.
  5. The article defaults to draft state (`published: false`), unless explicitly set to `true`.

#### `REQ-ART-03`: Update Article
- **Endpoint**: `PUT /api/articles/:slug` (Auth Required)
- **Acceptance Criteria**:
  1. Returns HTTP `200 OK` with updated article fields.
  2. Only the authoring user is authorized to update the article (returns HTTP `403 Forbidden` for non-authors).
  3. If `title` is modified, a new unique `slug` is generated.
  4. The `updatedAt` field is updated with the current timestamp.

#### `REQ-ART-04`: Delete Article
- **Endpoint**: `DELETE /api/articles/:slug` (Auth Required)
- **Acceptance Criteria**:
  1. Returns HTTP `204 No Content` with an empty response body.
  2. The article record is permanently deleted from the database.
  3. Only the authoring user is authorized to delete the article (returns HTTP `403 Forbidden` for non-authors).
  4. If the slug does not exist, the server returns HTTP `404 Not Found`.

#### `REQ-ART-05`: Article Publication & Visibility Control
- **Publication Endpoint**: `POST /api/articles/:slug/publish` (Auth Required)
- **Business Rules & Visibility Matrix**:
  1. **Draft State by Default**: Newly created articles default to `published: false` (Draft).
  2. **Unauthenticated Public Users**:
     - `GET /api/articles`: Only articles with `published = true` are included in the public feed.
     - `GET /api/articles/:slug`: If the article is `published: false`, the server **must** return HTTP `404 Not Found`.
  3. **Authenticated Authors (Article Owners)**:
     - `GET /api/articles`: Returns all published articles **plus** the author's own draft articles.
     - `GET /api/articles/:slug`: The author can retrieve their own draft article (`200 OK`). Non-owners receive `404 Not Found`.
  4. **Publication Workflow (`POST /api/articles/:slug/publish`)**:
     - Only the authoring user is authorized to publish the article (other users receive HTTP `403 Forbidden`).
     - Sets `published` to `true`, updates `updatedAt`, and returns HTTP `200 OK`.
     - Automatically triggers **Cache Invalidation** so the newly published article immediately appears in the public feed.

---

### 4. Caching Module (`REQ-CACHE`)

#### `REQ-CACHE-01`: Cache Hit / Miss Lifecycle
- **Caching Mechanism**:
  - Key Schema: `articles:list:<audience>:<limit>:<offset>:<tag>:<author>`
  - Time-To-Live (TTL): **60 seconds**.
- **Acceptance Criteria**:
  1. **Cache MISS**: When an article list query is received and no matching key exists in the cache:
     - Data is queried from the primary database.
     - Data is cached in Redis with a 60-second TTL.
     - Response includes diagnostic header: `X-Cache: MISS`.
  2. **Cache HIT**: When a subsequent identical request is received within the TTL window:
     - Data is served directly from the cache without querying the database.
     - Response includes diagnostic header: `X-Cache: HIT`.

#### `REQ-CACHE-02`: Cache Invalidation upon Mutation
- **Eviction Mechanism**:
  - Any mutating operation (`POST /api/articles`, `PUT /api/articles/:slug`, `DELETE /api/articles/:slug`, or `POST /api/articles/:slug/publish`) **must** invalidate all cached article list keys (`DEL articles:*`).
- **Acceptance Criteria**:
  1. Following any article mutation, the subsequent `GET /api/articles` call **must** return `X-Cache: MISS` (guaranteeing fresh data from the database).

---

### 5. Data Persistence & Integrity Module (`REQ-DB`)

#### `REQ-DB-01`: Relational Persistence & Foreign Key Integrity
- **Target Tables**: `articles` & `users`
- **Acceptance Criteria**:
  1. Article creation (`POST /api/articles`) must persist `title`, `description`, `body`, `published`, and foreign key `author_id` mapping to the `users.id` table.
  2. Deleting an article (`DELETE /api/articles/:slug`) must permanently purge the row from the `articles` table.
  3. Foreign key constraints must prevent orphaned article records.

#### `REQ-DB-02`: ISO-8601 Temporal Timestamp Standards
- **Acceptance Criteria**:
  1. All timestamp fields (`createdAt`, `updatedAt`) across articles and user entities **must** be stored and formatted in valid ISO-8601 UTC representation (e.g. `2026-09-05T04:32:33.440Z`).

---

### 6. Taxonomy & Tags Module (`REQ-TAG`)

#### `REQ-TAG-01`: Global Tags Retrieval
- **Endpoint**: `GET /api/tags`
- **Acceptance Criteria**:
  1. Returns HTTP `200 OK`.
  2. Response body contains a `tags` array of strings:
     ```json
     {
       "tags": ["playwright", "automation", "articlehub", "redis", "postgres"]
     }
     ```
  3. Tags are unique (no duplicates).
