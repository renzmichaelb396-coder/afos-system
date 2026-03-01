# Integration Determinism Lock (2026-03-01)

Problem
- Integration login intermittently failed (401) even though seed existed via CLI.
- Root cause: non-deterministic environment: shared DB + multiple processes + differing env loads.

Fix
- Introduced dedicated test DB via .env.test (DATABASE_URL points to afos_test).
- Created scripts/test-integration.sh to run:
  - reset+migrate against test DB
  - seed fixtures against test DB
  - start dev server with .env.test
  - run vitest sequentially with maxWorkers=1

Result
- Login stable (200), all integration tests pass deterministically.

How to run
- pnpm run test:integration

If regression happens
- Confirm .env.test DATABASE_URL is afos_test
- Confirm dev server is started with dotenv -e .env.test
- Confirm vitest uses --no-file-parallelism and --maxWorkers=1
