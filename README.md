# Support Dev Lab

A minimal full-stack sandbox to practice support/developer workflows:
debugging across services, working with SQL/NoSQL stores, and containerized deploys.

## Stack
- Node.js + Express (API)
- PostgreSQL (notes)
- Redis (cache/counter)
- Elasticsearch (full-text search)
- NGINX (static hosting + reverse proxy)
- Backbone.js (tiny SPA front-end)
- Mocha + Chai + Supertest (smoke tests)
- Docker Compose (multi-service dev)

## Run locally
```bash
docker compose up --build -d
# UI: http://localhost:8080
