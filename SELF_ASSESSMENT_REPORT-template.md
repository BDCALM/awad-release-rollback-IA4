# Self-assessment — IA#4

Submitted by: 23120242 — [Your Full Name] 
Total I claim: [Your Total] / 100

| Criterion | Max | I claim | Evidence |
|---|---|---|---|
| 1. The image and its configuration | 20 | [Score] | check-log.txt (I1–I15 all green); Dockerfile, .dockerignore, and src/config.js created. |
| 2. The change, behind a flag | 10 | [Score] | check-log.txt (T3 and F1–F7 all green); change hidden behind feature flag in src/. |
| 3. Migration and deploy order | 15 | [Score] | check-log.txt (C1–C4 and L5 green); RELEASE.md table complete (5 columns); tags v1 & v2 present. |
| 4. The canary release | 15 | [Score] | load-log.txt (L0–L4 green, zero fails outside bad canary, 25% stage > 10s); RELEASE.md explains gate limit. |
| 5. The way back | 20 | [Score] | load-log.txt (L6–L9 green); time to rollback under 5 mins; release-log.txt shows auto-stop; RELEASE.md lists rollback leftovers. |
| 6. Brief, commits and checking | 20 | [Score] | git log shows clean separated commits; tag `starter` exists before changes; BRIEF.md and AI-LOG.md completed with Rejected items. |

## What I did not manage
[Write honestly about anything you couldn't get to work perfectly. For example: "I couldn't get the automated gate to stop traffic by itself, so I had to trigger the rollback manually, costing me points in Criterion 5." If everything was perfect, you can state: "I managed to complete all requirements successfully."]

## What I would do differently
[Reflect on your process. For example: "I would instruct the AI to write smaller, more focused migrations from the start, as debugging a large SQL file during the load test was stressful."]