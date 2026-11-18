# Release Plan: Canary Deployment & Rollback Strategy

## 1. Step-by-Step Release Matrix

| Step | Schema After Step | Serving Version | Exact Command | How to Undo It | Compatible Versions |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Baseline Staging** | `001_init` | `linkbox:v1` (100% blue) | `BLUE_TAG=v1 docker compose up -d --no-deps blue` | `docker compose down -v` | `v1` |
| **2. Database Migration Up** | `002_expiry` | `linkbox:v1` (100% blue) | `npm run migrate:image -- v2` | `npm run migrate:image -- v2 down` | `v1`, `v2` (Expand phase: `expires_at` is nullable; `v1` serves uninterrupted) |
| **3. Canary Release v2 (Stage 1)** | `002_expiry` | `v1` (80% blue), `v2` (20% green) | `npm run release -- v2` | Automated rollback: router shifts 100% to blue, stops green | `v1`, `v2` |
| **4. Canary Release v2 (Stage 2)** | `002_expiry` | `v1` (50% blue), `v2` (50% green) | `npm run release -- v2` (auto-advances after 12 s if 0 errors) | Automated rollback: router shifts 100% to blue, stops green | `v1`, `v2` |
| **5. Full Cutover v2** | `002_expiry` | `linkbox:v2` (100% green) | `npm run release -- v2` (promotes to 100% after stage 2) | `npm run rollback` (shifts 100% back to blue) | `v1`, `v2` |
| **6. Feature Flag Activation** | `002_expiry` | `linkbox:v2` (100% green) | `curl -i -X PUT http://localhost:8080/admin/flags/expiry -H "x-admin-token: staging-only-not-a-secret" -H "Content-Type: application/json" -d '{"enabled": true}'` | `curl -i -X PUT http://localhost:8080/admin/flags/expiry -H "x-admin-token: staging-only-not-a-secret" -H "Content-Type: application/json" -d '{"enabled": false}'` | `v1`, `v2` |
| **7. Rollback Verification Drill** | `002_expiry` | `linkbox:v1` (100% blue) | `npm run rollback` | `npm run release -- v2` | `v1`, `v2` (`v1` runs cleanly on migrated schema `002_expiry`) |
| **8. Re-promote v2** | `002_expiry` | `linkbox:v2` (100% green) | `npm run release -- v2` | `npm run rollback` | `v1`, `v2` |
| **9. Fault Injection Drill (v3-bad)** | `002_expiry` | `v2` (`2.0.0`, 80% green), `v3-bad` (`2.0.1-bad`, 20% blue) | `npm run release -- v3-bad` | **Auto-rollback by Canary Gate**: trips in 1 s after 2 HTTP 500 errors out of 5 requests, halts release, restores 100% to green (`v2`) | `v2` |

---

## 2. Point of No Return & Data Durability

* **Point of No Return:**
  - Running `npm run migrate:image -- v2 down` after links with expiration have been actively created by users.
  - *Reason:* Reverting migration 002 executes `ALTER TABLE links DROP COLUMN expires_at` and `DROP TABLE flags`. Any expiration metadata (`expires_at`) created while `v2` was live will be permanently dropped from SQLite.
  - *Mitigation:* While traffic is serving, do NOT execute database down-migrations. If a rollback is required, only perform traffic rollback (`npm run rollback`). Because `002_expiry` follows the expand-and-contract pattern (new column is nullable), `v1` runs seamlessly on the `002_expiry` schema indefinitely without needing schema rollbacks.

* **What Rollback Does NOT Undo:**
  - **Behavior of Expired Links While `v1` Serves:** `v1` does not read the `expires_at` column or the `flags` table. Therefore, while `v1` is serving during a rollback, any link whose `expires_at` timestamp passes will **temporarily continue to redirect with HTTP 302** (and increment hit counts) instead of returning `410 Gone`. However, the `expires_at` timestamp remains intact in SQLite, so the moment traffic rolls forward to `v2` (with the `expiry` flag still ON in DB), that link immediately starts returning `410 Gone` again.
  - **Hit Counters & Links Created Under Bad Releases:** Any hits successfully recorded or links created in SQLite during canary stages persist in `/data/app.db`.
  - **Recorded Error Logs:** 5xx responses received by clients during a bad release are logged in `load-log.txt` and cannot be erased.

---

## 3. Canary Gate Specification

* **Gate's Limit:**
  - In `deploy/release.js` (line 95), the automated canary gate evaluates:
    $$\text{currErrors} \ge 2 \quad \lor \quad (\text{currRequests} \ge 10 \;\land\; \text{errorRate} > 0.05)$$
  - Polling frequency: `GET http://127.0.0.1:8081/state` queried every 1 second during each canary stage.
* **Why that number:**
  - Under steady traffic of $40\text{ req/s}$, a $20\%$ canary share delivers $\approx 8\text{ req/s}$ to the candidate container.
  - In a faulty release (such as `linkbox:v3-bad` with a $30\%$ failure rate on reads), approximately $2.4\text{ errors/s}$ are generated.
  - A threshold of $\ge 2$ errors triggers the gate within $1\text{ to }1.5\text{ seconds}$. In the verified execution (`load-log.txt`), `v3-bad` received **5 requests and failed 2** (HTTP 500 at lines 167–169, `T+145.4s` and `T+145.8s`). The gate automatically tripped, cutting traffic back to $100\%$ green (`2.0.0`) in **1 second** (line 170). This capped peak canary weight at $20\%$ (well below the $25\%$ limit of `L7`), limited total failed requests to 2, and achieved a 1-second rollback (well below the 300-second limit of `L8`).
* **What it misses:**
  - **Silent semantic bugs:** Responses that return HTTP 200 but contain corrupted data or wrong business calculations.
  - **Latency spikes & memory leaks:** Slow responses that do not time out within the 10-second router threshold or leaks that degrade performance after hours rather than seconds.
  - **Write-only or rare-endpoint faults:** Bugs located on low-traffic endpoints that receive fewer than 2 calls during the brief canary window.
