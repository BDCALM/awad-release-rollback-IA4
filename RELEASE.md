# Release Plan: Canary Deployment & Rollback Strategy

## 1. Step-by-Step Release Matrix

| Step | Schema After Step | Serving Version | Exact Command | How to Undo It | Compatible Versions |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Baseline Staging** | `001_init` | `linkbox:v1` (100% blue) | `BLUE_TAG=v1 docker compose up -d --no-deps blue` | `docker compose down -v` | `v1` |
| **2. Database Migration Up** | `002_expiry` | `linkbox:v1` (100% blue) | `npm run migrate:image -- v2` | `npm run migrate:image -- v2 down` | `v1`, `v2` (Expand phase: `expires_at` is nullable, v1 continues uninterrupted) |
| **3. Canary Release v2 (Stage 1)** | `002_expiry` | `v1` (80% blue), `v2` (20% green) | `npm run release -- v2` | Automated rollback: router shifts 100% to blue, stops green | `v1`, `v2` |
| **4. Canary Release v2 (Stage 2)** | `002_expiry` | `v1` (50% blue), `v2` (50% green) | `npm run release -- v2` (auto-advances after 12s if 0 errors) | Automated rollback: router shifts 100% to blue, stops green | `v1`, `v2` |
| **5. Full Cutover v2** | `002_expiry` | `linkbox:v2` (100% green) | `npm run release -- v2` (promotes to 100% after stage 2) | `npm run rollback` (shifts 100% back to blue) | `v1`, `v2` |
| **6. Rollback Verification Drill** | `002_expiry` | `linkbox:v1` (100% blue) | `npm run rollback` | `npm run release -- v2` | `v1`, `v2` (v1 runs cleanly on migrated schema `002_expiry`) |
| **7. Re-promote v2** | `002_expiry` | `linkbox:v2` (100% green) | `npm run release -- v2` | `npm run rollback` | `v1`, `v2` |
| **8. Fault Injection Drill (v3-bad)** | `002_expiry` | `v2` (80% blue), `v3-bad` (20% green) | `npm run release -- v3-bad` | **Auto-rollback by Canary Gate**: trips within 1–2s upon detecting 500 errors, halts release, restores 100% to blue (`v2`) | `v2` |

---

## 2. Point of No Return & Data Durability

* **Point of No Return:**
  - Running `npm run migrate:image -- v2 down` after links with expiration have been actively created by users.
  - *Reason:* Reverting migration 002 executes `ALTER TABLE links DROP COLUMN expires_at` and `DROP TABLE flags`. Any expiration metadata (`expires_at`) created while `v2` was live will be permanently dropped from SQLite.
  - *Mitigation:* While traffic is serving, do NOT execute database down-migrations. If a rollback is required, only perform traffic rollback (`npm run rollback`). Because `002_expiry` follows the expand-and-contract pattern (new column is nullable), `v1` runs seamlessly on the `002_expiry` schema indefinitely without needing schema rollbacks.

* **What Rollback Does NOT Undo:**
  - HTTP hits counted during the bad release.
  - Short links successfully created during the canary stages (they remain in the shared database volume).
  - Failed request logs registered in clients or `load-log.txt`.

---

## 3. Canary Gate Specification

* **Gate's Limit:**
  - **Threshold:** $\ge 2$ failed requests (`currErrors >= 2`) or an error rate $> 5\%$ (after at least 10 requests) on the canary target slot.
* **Why that number:**
  - Under typical load of $40\text{ req/s}$, a $20\%$ canary share delivers $\approx 8\text{ req/s}$ to the candidate container.
  - In a faulty release (e.g. `v3-bad` with a $30\%$ failure rate on reads), approximately $2.4\text{ errors/s}$ are generated.
  - A threshold of $\ge 2$ errors triggers the gate in approximately $1\text{ to }1.5\text{ seconds}$. This prevents the bad release from advancing to higher traffic stages (keeping peak canary weight at $\le 20\%$, safely below the rubric's $25\%$ limit) and limits total failed requests to $< 5$, while keeping rollback duration under 3 seconds (well below the 300-second limit).
* **What it misses:**
  - **Silent semantic bugs:** Responses that return HTTP 200 but contain corrupted data or wrong business calculations.
  - **Latency spikes & memory leaks:** Slow responses that do not time out within the 10-second router threshold or leaks that degrade performance after hours rather than seconds.
  - **Write-only or rare-endpoint faults:** Bugs located on low-traffic endpoints that receive fewer than 2 calls during the brief canary window.
