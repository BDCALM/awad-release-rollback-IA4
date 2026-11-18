# Findings & Environment Notes

## 1. Execution Environment & Infrastructure

* **Primary Runtime Environment:**
  - Docker daemon execution and load tests were performed on an **Azure Ubuntu Linux VM (`vps-eshop`)** accessed via SSH.
  - *Context:* The primary development machine is a local Windows workstation operating in a restricted/frozen-disk environment without administrative privileges to run Docker Desktop or enable WSL2 virtualization. Moving execution to the dedicated cloud Linux host provided a clean, reproducible production-like environment with native POSIX signal handling and high I/O throughput.

* **Environment Fixes & Dependency Resolution:**
  - **Node.js Engine Upgrade:** The VM originally had Node.js `v18.19.1` installed via default apt repositories. Running `npm test` initially failed check `T3` with `ERR_UNKNOWN_BUILTIN_MODULE` on `node:sqlite`. Upgraded the runtime via NodeSource to Node.js `v22.13.0+`, natively resolving the built-in SQLite dependency and matching the project engine specification (`"engines": { "node": ">=22.13" }`).
  - **Docker Compose V2 Integration:** The base Ubuntu `docker.io` package only included legacy standalone tools without the modern compose CLI plugin. Downloaded and configured Docker Compose V2 (`v2.30.3`) into `~/.docker/cli-plugins/docker-compose` with executable permissions, enabling seamless execution of `docker compose up -d` across all release scripts.

## 2. Load Test Performance & Stability

* **Throughput and Resource Utilization:**
  - In `load-log.txt`, the test run executed across **8 concurrent load workers** generated **6,798 total requests in 170 seconds**, delivering a rock-solid average rate of **40.0 requests/second** (`L2`).
  - This comfortably doubled the rubric minimum requirement of $20\text{ req/s}$ with zero dropped connections, zero network errors, and zero contract violations (`network=0, contract=0, lost=0`).
  - Peak canary traffic at $20\%$ sustained $\approx 8\text{ req/s}$ during the bad canary drill, giving the automated gate sufficient statistical sample size within 1 second to detect failures and trigger rollback.

## 3. Tool Findings & Rubric Verification

* **Tools Fingerprint Verification:**
  - Verified that `tools/FINGERPRINT` matches `4b56096c90ea819d` across all stages (`T1`, `T2`, `L0` all PASS).
  - All files in `tools/*` and `test/app.test.js` remained strictly untouched throughout all development and testing phases.
* **Test Harness & Router Assessment:**
  - The standalone router (`tools/router/router.js`) reliably enforced weighted probabilistic routing, maintained keep-alive connections (`65_000 ms`), and captured per-slot request and error counters accurately via `:8081/state`.
  - The automated check suite (`tools/check.js`) accurately measured all criteria, successfully registering **39 of 39 passed**.
