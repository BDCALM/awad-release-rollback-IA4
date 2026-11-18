# Agent Skills and Allowed Commands

This document outlines the allowed commands that the AI coding agent can execute without requiring explicit user review or approval. It also sets the strict guidelines and context for completing the "IA#4 — Release and rollback" assignment.

## 1. Auto-Approved Commands (No Review Needed)

The agent is granted permission to execute the following terminal commands automatically to speed up development and testing:

### File System & Read Operations
- `ls`, `ls -la`, `pwd`
- `cat`, `head`, `tail`, `less`
- `grep`, `find`

### Git Operations (Read & Stage)
- `git status`, `git log`, `git diff`
- `git add <file>`
- *Note:* Do **NOT** auto-execute `git commit` or `git tag`. The commit history must be strictly controlled by the user as per the assignment grading rubric (starter -> packaging -> change -> release scripts). Always ask the user before committing.

### Node.js & Project Scripts
- `npm install`, `npm ci`
- `npm test`
- `npm run check`
- `node <script_name>`

### Docker Operations (Read & Build)
- `docker ps`, `docker ps -a`
- `docker logs <container_name>`
- `docker build -t <tag> .`
- `docker images`

### IA#4 Specific Commands (Safe to Run)
- `npm run release -- <tag>`
- `npm run rollback`
- `npm run load`

---

## 2. IA#4 Assignment Strict Guidelines

When working on this repository, the agent MUST adhere to the following rules based on the assignment rubric. **DO NOT deviate from these rules.**

### A. FORBIDDEN FILES (DO NOT MODIFY)
Under no circumstances should you modify any files in the following locations:
- `tools/*` (including any subdirectories)
- `test/app.test.js`
*Reason: Altering these will change the fingerprint (`4b56096c90ea819d`) and result in an automatic score of 0 for key criteria.*

### B. Deployment & Canary Release Requirements
- **Release Script (`deploy/release.js`)**: Must shift traffic in at least two stages below 100%. The first stage must be **25% or less** and hold for **at least 10 seconds**.
- **Health Check**: The release script MUST wait for Docker to report the container as `healthy` before moving any traffic to the new version.
- **Auto-rollback / Gate**: The release script must monitor for failed requests. It must stop the bad release *by itself* (automatically) without requiring the user to manually run a command if the error rate exceeds the limit.
- **Rollback Script (`deploy/rollback.js`)**: Must execute in a single command and complete the rollback (from first failed request to last answered request) in under 5 minutes.

### C. Logging & Deliverables
- Help the user maintain `RELEASE.md`, `BRIEF.md`, and `AI-LOG.md`.
- Track the exact prompts used and note any mistakes made by the AI in `AI-LOG.md` (under "Rejected").
- Ensure `load-log.txt`, `release-log.txt`, and `check-log.txt` are properly generated before finalizing the work.