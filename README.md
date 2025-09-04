# CaseIQ Support Developer Lab (1-hour Demo)

This tiny lab hits all the buzzwords you'll likely discuss in a Support Developer screen:
**Node.js + Express, Backbone.js, NGINX, Redis, PostgreSQL, Elasticsearch, Mocha** — all running via **Docker Compose** on Windows.

## TL;DR (5 Commands)

```bash
# 1) Start everything
docker compose up --build -d

# 2) Seed Elasticsearch with a sample doc
curl -X POST http://localhost/api/search/seed

# 3) Hit basic health checks
curl http://localhost/api/health
curl http://localhost/api/cache
curl http://localhost/api/db/time
curl "http://localhost/api/search?q=hello"

# 4) Run API tests (Mocha) inside the api container
docker compose exec api npm test

# 5) Open the UI (Backbone app) in the browser
# visit: http://localhost
```

## Prereqs
- **Docker Desktop** on Windows (WSL 2 backend recommended).
- Ports used: 80 (NGINX), 3000 (api), 5432 (Postgres), 6379 (Redis), 9200 (Elasticsearch).

## What’s Inside
- `api/` — Node.js + Express; endpoints for health, Redis cache, Postgres query, and Elasticsearch search/seed.
- `web/` — Single-page Backbone.js app that calls the API.
- `nginx/` — Reverse proxy + static file hosting for the Backbone app; proxies `/api` to the Express service.
- `docker-compose.yml` — Spins up **api**, **nginx**, **redis**, **postgres**, **elasticsearch**.

## Notes
- **Elasticsearch 7.17** used to keep auth off for simplicity.
- Sample table is created on first run (`api/src/db/init.sql`). On boot, the API runs a trivial migration.
- Keep it minimal; you're showing breadth + ability to integrate.
