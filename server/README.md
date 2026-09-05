# ArticleHub Mock API Server (Standalone Guide)

A high-performance mock backend server built with **Express.js (TypeScript)**, **PostgreSQL**, and **Redis**. It provides a fully functional REST API modeling the ArticleHub publishing platform, designed specifically for **automated end-to-end testing** and **manual exploratory testing**.

> 💡 **Functional Specifications & Acceptance Criteria**:  
> For detailed business rules, input boundary validation matrices, caching behaviors, and data schema criteria, please refer to:  
> 📄 **[API Requirements & Specifications (API_REQUIREMENTS.md)](API_REQUIREMENTS.md)**

---

## Key Features

- **Automated Database Lifecycle**: Schema tables (`users`, `tags`, `articles`) and initial test seeds are provisioned automatically on server startup.
- **Article Publication & Draft Mode**: Visibility control (`published: false` by default for drafts; authors can view their own drafts and publish them via `POST /api/articles/:slug/publish` to make them publicly visible).
- **Redis Caching**: The `GET /api/articles` endpoint features caching with diagnostic headers (`X-Cache: HIT` / `X-Cache: MISS`).
- **Cache Invalidation**: Mutation operations (`POST`, `PUT`, `DELETE /api/articles`, and `POST /api/articles/:slug/publish`) automatically evict corresponding Redis cache keys.
- **Interactive Swagger UI**: Interactive OpenAPI 3.0 documentation allowing exploratory manual testing directly from your browser.
- **Negative Testing Support**: Strict input validation, including username boundary checks (3 - 20 characters).

---

## Prerequisites

Ensure you have the following installed on your system:
- [Node.js](https://nodejs.org/) (v18+)
- [Docker](https://www.docker.com/) & Docker Compose

---

## Running the Server (Dual-Hybrid Mode)

The server supports **two flexible execution modes**:

---

### Mode 1: Fully Containerized (Reviewer Quickstart / 1-Command)
The entire stack (**PostgreSQL + Redis + Express API Server + Swagger UI**) runs isolated inside Docker containers. Reviewers can start everything with a single command without configuring local Node.js environments.

1. **Start the complete stack**:
   ```bash
   npm run docker:up
   ```
   *(Or standard docker command: `docker compose up -d --build`)*

2. **Access Swagger UI**:
   Open your browser at: **[http://localhost:3001/api-docs](http://localhost:3001/api-docs)**

3. **Stream Live SQL Queries & HTTP Logs**:
   ```bash
   npm run docker:logs:api
   ```
   *(Press `Ctrl + C` to exit the log streamer without stopping containers).*

---

### Mode 2: Developer Mode (Live Coding & Direct Terminal Logs)
Ideal for active development on files in `server/src/`, streaming SQL queries and HTTP logs directly to your active terminal.

1. **Spin up infrastructure services only (PostgreSQL & Redis)**:
   ```bash
   npm run docker:infra
   ```
   *(Starts PostgreSQL on `5432` and Redis on `6380` in the background).*

2. **Start the API Server on your host**:
   ```bash
   npm run start:server
   ```
   *(Or `npm run start:server:watch` for auto-reloading on file edits).*

3. Real-time SQL queries, Redis cache hit/miss statuses, and incoming HTTP requests will be printed directly to your terminal.

---

## Database Management: Native TypeScript Migrations & Seeders

Database schema evolution and test fixtures are managed cleanly using native TypeScript scripts:

| Command | Description |
| :--- | :--- |
| `npm run db:migrate` | Executes all pending migration files in `server/src/db/migrations/` |
| `npm run db:rollback` | Reverts the latest batch of database migrations |
| `npm run db:seed` | Runs seeders in `server/src/db/seeders/` to populate default users & articles |
| `npm run db:reset` | Truncates all data tables and re-seeds fresh test fixtures |

> 💡 **Automatic & Idempotent**: When the API server starts, it automatically runs migrations and seeders if the database is uninitialized. You do not need to run these manually unless you want to reset state for clean test isolation.

### Real-Time Query & Cache Logging
Whenever an endpoint is invoked (via Swagger, curl, or Playwright), the terminal outputs the exact SQL query executed, execution latency, bound parameters, and Redis cache diagnostics:

- **Cache MISS Example (Database Query Executed)**:
  ```text
  [Articles List] Requester: Public (Unauthenticated)
  [SQL Query] SELECT a.*, u.username as author_username, u.bio as author_bio, u.image as author_image FROM articles a JOIN users u ON a.author_id = u.id WHERE a.published = true ORDER BY a.created_at DESC LIMIT $1 OFFSET $2
    └─ Params: [10,0] | Duration: 4ms | Rows: 10
  [SQL Query] SELECT COUNT(*) FROM articles a JOIN users u ON a.author_id = u.id WHERE a.published = true
    └─ Duration: 1ms | Rows: 1
  [Redis Cache MISS] articles:list:public:10:0:all:all (fetched from DB & cached 60s)
  GET /api/articles?limit=10&offset=0 200 (18ms)
  ```

- **Cache HIT Example (Served Directly from Redis)**:
  ```text
  [Articles List] Requester: Public (Unauthenticated)
  [Redis Cache HIT] articles:list:public:10:0:all:all
  GET /api/articles?limit=10&offset=0 200 (2ms)
  ```

- **Data Mutation Example (Database Write + Cache Invalidation)**:
  ```text
  [SQL Query] INSERT INTO articles (slug, title, description, body, tag_list, favorited, favorites_count, published, author_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *
    └─ Params: ["slug-title", "Title", ...] | Duration: 5ms | Rows: 1
  [Redis Cache] Invalidated keys: [ 'articles:list:public:10:0:all:all' ]
  POST /api/articles 201 (15ms)
  ```

---

## Using Swagger UI for Manual Exploratory Testing

1. Open your browser and navigate to:
   **[http://localhost:3001/api-docs](http://localhost:3001/api-docs)**

2. **Authenticate (Login)**:
   - Expand the **`POST /users/login`** endpoint, click **Try it out**.
   - Use default seeded credentials:
     ```json
     {
       "user": {
         "email": "imtester@mail.com",
         "password": "imtester123"
       }
     }
     ```
   - Click **Execute** and copy the `token` string from the JSON response.

3. **Set Authorization Header**:
   - Scroll to the top of Swagger UI, click the green **Authorize** button (padlock icon).
   - Enter your token:
     ```text
     Token <paste_your_jwt_token_here>
     ```
   - Click **Authorize**, then close the modal.

4. **Explore API Endpoints**:
   - **View Public Articles (`GET /articles`)**: Click Execute. Check the response headers for `X-Cache`. The first request is `MISS` (served from PostgreSQL), subsequent requests are `HIT` (served from Redis). Only `published: true` articles are visible if unauthenticated.
   - **Create New Article (`POST /articles`)**: Creates an article defaulting to `published: false` (draft).
   - **Verify Draft Isolation**:
     - Call `GET /articles` without authorization: the newly created draft **does not appear** in the public feed.
     - Call `GET /articles/{slug}` without authorization: returns `404 Not Found`.
     - Call `GET /articles/{slug}` with the author's token: returns `200 OK` (author can view their own draft).
   - **Publish Article (`POST /articles/{slug}/publish`)**:
     - Call the publish endpoint with author authorization. Status flips to `published: true` and Redis cache is evicted.
     - Re-run `GET /articles` without logging in: the article is now publicly available!
   - **User Logout (`POST /users/logout`)**:
     - Call the logout endpoint with authorization. The server registers the token in the Redis blocklist (`200 OK`).
     - Subsequent calls to any protected endpoint with this token will be rejected with **`401 Unauthorized`**.

---

## Redis Cache Inspection & Invalidation Verification

Inspect active Redis keys, verify cache eviction, and monitor token blocklists directly via CLI:

### 1. Launch Redis CLI
Run from the root project directory:

```bash
npm run redis:cli
```
*(Or standard docker command: `docker exec -it playwright-framework-redis redis-cli`)*

### 2. Essential Redis Commands

| Command | Description | Example |
| :--- | :--- | :--- |
| `KEYS *` | List all currently active cached keys | `KEYS *` |
| `KEYS articles:*` | List cached article feeds | `KEYS articles:*` |
| `KEYS token:blocklist:*` | List revoked JWT tokens stored in the Redis blocklist | `KEYS token:blocklist:*` |
| `GET <key>` | View raw JSON payload stored in the cache | `GET "articles:list:public:10:0:all:all"` |
| `TTL <key>` | Check remaining Time-To-Live in seconds | `TTL "articles:list:public:10:0:all:all"` |
| `FLUSHDB` | Manually flush all keys in the Redis database | `FLUSHDB` |

### 3. Test Scenario: Verifying Cache Invalidation on Mutation

1. **Populate the Cache**:
   - In Swagger UI, execute `GET /articles?limit=10`.
   - Response header displays `X-Cache: MISS`.
2. **Inspect in Redis CLI**:
   - Run `KEYS *`. You will see `articles:list:public:10:0:all:all`.
3. **Trigger Mutation**:
   - In Swagger UI, create a new article via `POST /articles` or publish a draft via `POST /articles/{slug}/publish`.
4. **Verify Eviction**:
   - In Redis CLI, run `KEYS *` again.
   - The cached list keys are **evicted automatically**, preventing stale data.
5. Exit Redis CLI by typing `exit`.

---

## PostgreSQL Database Inspection (Debugging & Data Validation)

For direct database assertion, connect to the interactive PostgreSQL CLI (`psql`) or your favorite database GUI client.

### 1. Launch PostgreSQL CLI (psql)
Run from the root project directory:

```bash
npm run db:psql
```
*(Or standard docker command: `docker exec -it playwright-framework-postgres psql -U postgres -d articlehub_test`)*

### 2. Useful Query Commands for Debugging

| Debug Task | SQL Query / Command |
| :--- | :--- |
| **List tables** | `\dt` |
| **Inspect table schema** | `\d articles` |
| **View recent articles & publication status** | `SELECT id, slug, title, published, author_id FROM articles ORDER BY id DESC LIMIT 5;` |
| **Summarize draft vs published articles** | `SELECT published, COUNT(*) FROM articles GROUP BY published;` |
| **Find article by slug** | `SELECT * FROM articles WHERE slug = 'your-slug-here';` |
| **Count total articles** | `SELECT COUNT(*) FROM articles;` |
| **List registered users** | `SELECT id, username, email FROM users;` |
| **View applied migration history** | `SELECT * FROM _migrations;` |
| **Exit psql** | `\q` |

### 3. Connection Details for Database GUI Clients (DBeaver, TablePlus, DataGrip, VS Code)
- **Host**: `localhost`
- **Port**: `5432`
- **Database**: `articlehub_test`
- **Username**: `postgres`
- **Password**: `postgres`
- **Connection URI**: `postgresql://postgres:postgres@localhost:5432/articlehub_test`

---

## Environment Variables & Port Configuration

Configurable via `.env` or system environment variables:

| Variable | Default | Description |
| :--- | :--- | :--- |
| `PORT` | `3001` | Port for Express API Server and Swagger UI |
| `DB_HOST` | `localhost` | PostgreSQL host |
| `DB_PORT` | `5432` | PostgreSQL host port |
| `DB_USER` | `postgres` | Database user |
| `DB_PASSWORD` | `postgres` | Database password |
| `DB_NAME` | `articlehub_test` | Database name |
| `REDIS_HOST` | `localhost` | Redis host |
| `REDIS_PORT` | `6380` | Redis host port (isolated to prevent collision with port 6379) |
| `JWT_SECRET` | `articlehub-secret-key-12345` | Secret key for signing and verifying JWT tokens |

---

## Stopping Services & Containers

1. **Stop Host Server**: Press `Ctrl + C` in the terminal running `start:server`.
2. **Stop Docker Containers**:
   ```bash
   npm run docker:down
   ```
   *(Or `docker compose down`)*
