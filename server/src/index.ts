// Must be the very first import: under ESM, all `import` statements are
// hoisted and run before any other top-level code, so a later `dotenv.config()`
// call would fire *after* other imports (like ./app -> ./db/database) have
// already read process.env.DATABASE_URL. `dotenv/config` runs its side effect
// during module evaluation, so putting it first guarantees it runs first too.
import "dotenv/config";

import { createApp } from "./app";
import { migrate } from "./db/database";
import { TemplateRepository } from "./repositories/TemplateRepository";
import { PlanRepository } from "./repositories/PlanRepository";
import { AdminService } from "./services/AdminService";

const PORT = Number(process.env.PORT) || 4000;

async function start() {
  await migrate();

  // Populate the in-memory template/plan caches (see config/templates.ts and
  // config/subscriptionPlans.ts) from the DB tables migrate() just seeded,
  // and create the first admin account from env vars if none exists yet.
  await new TemplateRepository().refreshCache();
  await new PlanRepository().refreshCache();
  await new AdminService().ensureBootstrapAdmin();

  const app = createApp();
  app.listen(PORT, () => {
    console.log(`Websume API listening on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exitCode = 1;
});
