import { defineConfig } from "vitest/config";

/**
 * server/src/db/database.ts throws at import time if DATABASE_URL isn't
 * set (a deliberate fail-fast guard for real app startup — see that file).
 * Any test that imports a repository (even just for its TYPE, like
 * AuthService.test.ts's mocks, or transitively through ResumeService.ts's
 * own imports in ResumeService.test.ts) ends up importing database.ts too,
 * since ES module imports run a module's top-level code regardless of
 * whether the imported binding is actually used as a value.
 *
 * `pg`'s Pool doesn't eagerly connect on construction — it only connects
 * on first query — so a syntactically-valid but never-actually-reachable
 * connection string is enough to satisfy the guard without needing a real
 * database for these unit tests (none of them execute a query).
 */
export default defineConfig({
  test: {
    env: {
      DATABASE_URL: "postgresql://test:test@localhost:5432/test",
    },
  },
});
