# AI Development Log

## Log 1 — 2026-11-18: Initial Documentation Templates
* **Tool used:** Gemini 3.1 Pro
* **Asked for:** Generate starter templates for `RELEASE.md`, `NOTES.md`, and `BRIEF.md`.
* **Kept:** Initial templates for `RELEASE.md`, `NOTES.md`, and `BRIEF.md` as documentation skeletons after the `starter` tag.
* **Rejected:** Nothing.
* **Changed:** Standardized terminology to align with the assignment rubric (e.g., ensuring `starter` tag nomenclature).

---

## Log 2 — 2026-11-18: Project Roadmap & Technical Milestones
* **Tool used:** Gemini 3.1 Pro
* **Asked for:** Formulate a step-by-step roadmap to complete IA#4 release and rollback against the repository cloned from the template.
* **Kept:** Step breakdown covering Phase 1 (Packaging), Phase 2 (Feature/Schema), and Phase 3 (Release/Rollback).
* **Rejected:** Nothing.
* **Changed:** Nothing.

---

## Log 3 — 2026-11-18: Phase 1 — Production Docker Packaging & Staging Config
* **Tool used:** Gemini 3.8 Flash (High)
* **Asked for:** Implement Dockerfile, `.dockerignore`, and environment configuration (`src/config.js`, `env/`) to package the short-link service. Strictly avoid modifying `tools/` and `test/app.test.js`. Target passing check IDs `I1` to `I15`.
* **Kept:** `Dockerfile`, `.dockerignore`, `src/config.js`, `src/server.js`, `package.json`, `env/development.env`, `env/production.env`.
* **Rejected:** Nothing.
* **Changed:**
  - Pinned base image to `node:22.13-alpine` (55 MB download, $\ll 300\text{ MB}$ limit per `I2`).
  - Switched container execution to non-root `USER node` (`I3`) and removed all baked secrets (`I4`).
  - Updated `package.json` `"start"` script from `node src/migrate.js up && node src/server.js` to `node src/server.js`, preventing automatic migrations on container launch (`I15`).
  - Implemented graceful shutdown in `src/server.js` handling `SIGTERM`/`SIGINT` via `server.close()` and `server.closeIdleConnections()`, allowing slow in-flight probes to return HTTP 200 within 1.4 s during `docker stop` (`I10`).

---

## Log 4 — 2026-11-18: Phase 2 — Feature Behind Flag & Expand-and-Contract Migration
* **Tool used:** Gemini 3.8 Flash (High)
* **Asked for:** Implement the link expiry feature specified in `docs/CHANGE.md` inside `src/app.js` gated behind a database-stored feature flag `expiry`. Create forward migration `002_expiry.up.sql` and backward migration `002_expiry.down.sql`. Ensure full backward compatibility with `v1`. Must pass checks `T3`, `F1–F7`, and `C1–C4`.
* **Kept:** `migrations/002_expiry.up.sql`, `migrations/002_expiry.down.sql`, `src/app.js`, `src/config.js`.
* **Rejected:** Nothing.
* **Changed:**
  - Added nullable `expires_at TEXT` column to `links` and created `flags` table in `002_expiry.up.sql`, allowing `v1` to execute `INSERT` and `SELECT` without syntax errors (`C1`).
  - Implemented `002_expiry.down.sql` dropping `expires_at` and `flags` cleanly (`C4`).
  - Built database-backed flag persistence with instant propagation ($< 2\text{ ms}$, satisfying `F4`).
  - Implemented `PUT /admin/flags/expiry` requiring `x-admin-token` authentication (`F2`, `F3`).
  - Programmed conditional link resolution: when flag is OFF or link is not expired, return HTTP 302 and count hits; when flag is ON and expired, return HTTP 410 with `{"error": "expired"}` and do not increment hits (`F5`, `F6`, `F7`).

---

## Log 5 — 2026-11-18: Phase 3 — Automated Canary Release & Fast Rollback Scripts
* **Tool used:** Gemini 3.8 Flash (High)
* **Asked for:** Implement `deploy/release.js` and `deploy/rollback.js`. Implement health-check-first gating, multi-stage canary (Stage 1 $\le 25\%$ for $\ge 10\text{ s}$), and automated canary gate aborting bad releases on $> 5\%$ or $\ge 2$ errors. Rollback must execute in $< 5\text{ minutes}$ with zero failed requests on good releases. Target checks `L0–L9`.
* **Kept:** `deploy/release.js`, `deploy/rollback.js`, `RELEASE.md`.
* **Rejected:** Nothing.
* **Changed:**
  - `deploy/release.js`: Added Docker healthcheck polling via `docker inspect` before shifting any traffic; implemented Stage 1 at 20% for 12 s and Stage 2 at 50% for 10 s; built canary gate evaluating `currErrors >= 2 || (currRequests >= 10 && errorRate > 0.05)` from `GET :8081/state` every 1 s, automatically halting releases, restoring 100% traffic to the safe slot, and stopping the bad container.
  - `deploy/rollback.js`: Implemented one-command rollback shifting 100% traffic to the safe slot, posting router marks, verifying confirmed weights, and draining in-flight requests.
  - Updated `RELEASE.md` with complete matrix, Point of No Return analysis, and gate mathematical justification.

---

## Log 6 — 2026-11-18: Load Run Dry-Run Fixes, Metrics Validation & Final Documentation
* **Tool used:** Gemini 3.8 Flash (High)
* **Asked for:** Review actual execution evidence (`load-log.txt`, `release-log.txt`, `check-log.txt`), resolve real issues caught during verification, ensure all 39/39 checks pass, and update all 5 Markdown deliverables (`RELEASE.md`, `BRIEF.md`, `AI-LOG.md`, `NOTES.md`, `SELF_ASSESSMENT_REPORT.md`) without template placeholders.
* **Kept:** Verified execution metrics: 39 of 39 passed (`check-log.txt`), tools fingerprint `4b56096c90ea819d`, 6,798 total requests in 170 s at 40.0 req/s (`load-log.txt`), 0 failed requests outside bad canary, 2 errors during bad drill with 1 s rollback.
* **Rejected:**
  - **Rejected/Fixed #1 (Version Build Arg):** In the initial `v2` image build, `--build-arg APP_VERSION=2.0.0` was omitted, causing `v2` containers to report header `x-app-version: 1.0.0` (caught by inspecting HTTP response headers in `release-log.txt`). Rejected the mislabeled container image and rebuilt with explicit build argument: `docker build --build-arg APP_VERSION=2.0.0 -t linkbox:v2 .`.
  - **Rejected/Fixed #2 (Admin Auth Header):** Initial flag-toggle `curl` command suggested by assistant used `Authorization: Bearer <token>`, which returned `HTTP 401 Unauthorized` (caught by `curl -i` output and verified via `grep` on `src/app.js` line 129). Corrected the invocation to pass header `x-admin-token: staging-only-not-a-secret`.
* **Changed:**
  - **Changed #3 (Report Accuracy):** Updated `RELEASE.md` to insert the explicit Feature Flag Activation step, corrected slot designations to match `load-log.txt` (`v2` at 80% on green, `v3-bad` at 20% on blue), and answered the README question regarding expired link behavior during `v1` serving.
  - Completed `NOTES.md` detailing the Azure Linux VM test environment, Node 22 upgrade, and Docker Compose V2 setup.
  - Completed `SELF_ASSESSMENT_REPORT.md` claiming 100/100 backed by exact log line numbers and concrete evidence.
