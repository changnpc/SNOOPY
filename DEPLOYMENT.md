# SNOOPY — Deployment Guide

**SNOOPY** — System for National Organization and Optimized Practice of Youth
**Version:** 1.0.0
**Author:** Nattapong PIMPISAN &lt;pimpisan.cblt@gmail.com&gt;
© 2026 Nattapong PIMPISAN

---

## 1. Architecture

```
                ┌────────────────────────────────────────┐
   Browser ───▶ │  nginx (snoopy-frontend, port 80)      │
                │   • serves Angular SPA                  │
                │   • proxies /api/* → backend:3000       │
                └───────────────┬────────────────────────┘
                                │ (internal docker network)
                ┌───────────────▼────────────────────────┐
                │  Node/Express (snoopy-backend, :3000)   │
                │   • JWT auth + RBAC                      │
                │   • 5-min read cache, batched writes    │
                └───────────────┬────────────────────────┘
                                │
                ┌───────────────▼────────────────────────┐
                │  Google Sheets (DB) + Google Drive      │
                └─────────────────────────────────────────┘
```

Only the **frontend** publishes a host port (80). The backend is reachable
only inside the docker network via nginx (defence in depth).

---

## 2. Prerequisites

- Docker + Docker Compose
- A Google Cloud project with:
  - OAuth 2.0 Client ID (Web) — authorized redirect URI = `https://YOUR_DOMAIN/login`
  - A **service account** with the target Spreadsheet + Drive folder shared to it
  - `service-account.json` key file
- The Google Sheet provisioned with the required tabs (see `README.md`)

---

## 3. Configuration

```bash
cp .env.example .env
```

Fill in `.env`. **Production checklist:**

| Variable | Production value |
|---|---|
| `NODE_ENV` | `production` |
| `JWT_SECRET` | ≥32 random chars — `openssl rand -base64 48` |
| `GOOGLE_REDIRECT_URI` | `https://YOUR_DOMAIN/login` |
| `CORS_ORIGIN` | `https://YOUR_DOMAIN` (comma-separate if multiple) |
| `ENABLE_API_DOCS` | `false` (keep Swagger off in public prod) |
| `TRUST_PROXY_HOPS` | `1` (nginx) |
| `RATE_LIMIT_MAX_REQUESTS` | `300` (per IP / minute) |
| `AUTH_RATE_LIMIT_MAX` | `20` (per IP / minute on /api/auth) |

Place the service-account key at `./credentials/service-account.json`
(mounted read-only into the backend container).

The boot sequence **fails fast** (`process.exit(1)`) if any required variable
is missing or if `JWT_SECRET` is too short / still a placeholder.

Also update the frontend OAuth client id if needed in
`nybams-frontend/src/environments/environment.prod.ts` (`googleClientId`).

---

## 4. Build & Run

```bash
docker compose build
docker compose up -d
docker compose ps          # both services should be "healthy"
```

Verify:

```bash
curl http://localhost/api/health
# {"status":"ok","app":"SNOOPY","version":"1.0.0",...}
```

Open `http://localhost` (or your domain) and log in with a registered Google account.

### TLS / HTTPS
Terminate TLS at a front proxy (Caddy, Traefik, or an external load balancer /
cloud LB) in front of `snoopy-frontend:80`, or add a 443 server block + certs to
`nybams-frontend/nginx.conf`. OAuth requires HTTPS on a real domain.

---

## 5. Updating

```bash
git pull
docker compose build
docker compose up -d        # rolling restart; backend drains via graceful shutdown
```

The backend handles `SIGTERM`/`SIGINT` with a 10s graceful drain so in-flight
requests finish during restarts.

---

## 6. Capacity & Performance

**Load test result (50 concurrent users, 20s, `/api/health`):**

| Metric | Value |
|---|---|
| Throughput | ~22,000 req/s |
| Errors | 0 |
| Latency p50 / p95 / p99 | 2 / 3 / 5 ms |

Run it yourself any time:

```bash
cd nybams-backend
npm run loadtest -- --url=http://localhost/api/health --users=50 --duration=20
# Authenticated endpoint:
npm run loadtest -- --url=http://localhost/api/teams --users=50 --token=<JWT>
```

**The Node layer is not the bottleneck — Google Sheets API quota is.** Quotas
(per project, per minute): ~300 reads, ~300 writes. SNOOPY stays well under
this because:

- **Read-through cache** (5-min TTL) — repeated reads served from memory, so 50
  users browsing generate very few actual Sheets reads.
- **Batched writes** — bulk operations (e.g. team attendance) collapse to 1–2
  API calls instead of one per row.
- **Exponential-backoff retry** on HTTP 429 from Google.

For >300 concurrent or heavy write bursts, migrate the data layer to a real
database (Postgres) — the service interfaces already isolate this.

---

## 7. Security Posture (v1.0)

Implemented:
- ✅ Helmet security headers (+ HSTS in production)
- ✅ JWT auth on all `/api` routes; RBAC by role + team
- ✅ `trust proxy` so per-IP rate limiting works behind nginx
- ✅ Global rate limit (300/min/IP) + stricter auth limit (20/min/IP)
- ✅ CORS locked to whitelisted origins
- ✅ Swagger docs OFF by default in production
- ✅ Global error handler — no stack traces leaked to clients
- ✅ Boot-time env validation (fails fast on weak/missing secrets)
- ✅ Backend not publicly exposed (only via nginx)
- ✅ nginx hardening headers (nosniff, X-Frame-Options, Referrer-Policy)
- ✅ Request body size capped (10 MB)
- ✅ Graceful shutdown

Operational responsibilities:
- 🔑 Keep `.env` and `credentials/` out of version control (already gitignored).
- 🔑 Rotate `JWT_SECRET` and the service-account key periodically.
- 🔒 Serve only over HTTPS in production.

Known low-risk item:
- ⚠️ `npm audit` reports 5 *moderate* advisories, all transitive
  (`uuid` bounds-check via `googleapis`/`node-cron`, GHSA-w5hq-g745-h8pq).
  Not exploitable in our usage (we never pass buffers to `uuid`). The fix
  requires a major `googleapis` bump (144 → 173); schedule for a follow-up
  release after regression-testing the Sheets/Drive layer.

---

## 8. Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| Backend exits immediately on boot | Missing/short env var — read the `[ENV]` log line |
| All users rate-limited together | nginx not forwarding `X-Forwarded-For` / `TRUST_PROXY_HOPS` wrong |
| `CORS_FORBIDDEN` in browser | `CORS_ORIGIN` doesn't match the site origin exactly (scheme+host+port) |
| Login fails with `AUTH_ACCOUNT_NOT_FOUND` | Email not in the `users` sheet, or sheet not shared with service account |
| `429` during normal use | Raise `RATE_LIMIT_MAX_REQUESTS`, or check for a client retry loop |
| Google `429`/quota errors in logs | Cache working? Confirm reads aren't bypassing cache; reduce write frequency |
