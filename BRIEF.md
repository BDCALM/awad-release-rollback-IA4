# AI Briefs & Hand-overs

## Hand-over 1: Docker Packaging & Baseline Verification
* **Goal:** Author `Dockerfile`, `.dockerignore`, and environment configuration (`env/`, `src/config.js`) to package the Node.js application into a minimal, secure container image.
* **Limits/Constraints:** STRICTLY FORBIDDEN to modify any files in `tools/` or `test/app.test.js`. Pin base image version, enforce non-root user execution (`USER node`), avoid baking secrets into layers, and keep image size $\le 300\text{ MB}$.
* **Acceptance Criteria:** Check IDs `I1` through `I15` must pass green on `npm run check -- image`.

## Hand-over 2: Feature Implementation behind Database Flag
* **Goal:** Implement the link expiration feature from `docs/CHANGE.md` inside `src/app.js`, gated behind a database-backed `expiry` feature flag. Expose administrative endpoint `PUT /admin/flags/expiry` authenticated with `x-admin-token`.
* **Limits/Constraints:** Only edit files in `src/`. Do not alter `tools/` or `test/app.test.js`. Flag must be stored in SQLite and propagate across instances in $< 2\text{ s}$ without container restarts.
* **Acceptance Criteria:** Check IDs `T3` and `F1` through `F7` must pass green on `npm run check -- change`.

## Hand-over 3: Database Migrations & Zero-Downtime Compatibility
* **Goal:** Create forward and backward database migrations (`migrations/002_expiry.up.sql` and `migrations/002_expiry.down.sql`) following the expand-and-contract pattern.
* **Limits/Constraints:** Ensure `v1` continues running without errors on the migrated schema (expand phase: `expires_at` nullable). Ensure `down.sql` reverts cleanly without breaking `v1`.
* **Acceptance Criteria:** Check IDs `C1` through `C4` and `L5` must pass green on `npm run check -- compat`.

## Hand-over 4: Automated Canary Release Script
* **Goal:** Implement `deploy/release.js` (`npm run release -- <tag>`) to automate staged canary deployments into the idle slot. Must wait for Docker healthcheck before routing traffic, execute at least 2 canary stages below 100% (Stage 1: $\le 25\%$ for $\ge 10\text{ s}$), and promote to 100% upon success while leaving the old slot running.
* **Limits/Constraints:** Do not edit `tools/`. Use router control port `:8081` to manage traffic weights and emit descriptive audit marks.
* **Acceptance Criteria:** Check IDs `L0` through `L4` must pass green on `npm run check -- log`.

## Hand-over 5: Automated Canary Gate & Rollback Script
* **Goal:** Implement `deploy/rollback.js` (`npm run rollback`) and integrate an automated canary gate in `deploy/release.js`. Actively monitor router metrics during canary stages; if errors exceed threshold ($\ge 2$ errors or $> 5\%$ error rate), the gate must automatically halt the release, shift 100% traffic back to the safe slot within seconds, and stop the bad container without human intervention.
* **Limits/Constraints:** Rollback must execute in a single command, confirm weights from `GET :8081/state`, and complete well under the 5-minute limit.
* **Acceptance Criteria:** Check IDs `L6` through `L9` must pass green on `npm run check -- log`.

## Hand-over 6: Final Verification, Metrics Validation & Documentation
* **Goal:** Execute full load verification (`npm run load` across the complete deployment and drill lifecycle), capture logs (`load-log.txt`, `release-log.txt`, `check-log.txt`), verify that all 39 checks pass (`39 of 39 passed`), and complete final documentation (`RELEASE.md`, `BRIEF.md`, `AI-LOG.md`, `NOTES.md`, `SELF_ASSESSMENT_REPORT.md`).
* **Limits/Constraints:** Maintain tools fingerprint `4b56096c90ea819d`. Remove all template placeholders. Use verified execution evidence only.
* **Acceptance Criteria:** Full 39/39 checks pass, 0 failed requests outside bad canary, load throughput $\ge 20\text{ req/s}$ (actual $40.0\text{ req/s}$), all rubric deliverables documented.
