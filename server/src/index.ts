// Must be the very first import: under ESM, all `import` statements are
// hoisted and run before any other top-level code, so a later `dotenv.config()`
// call would fire *after* other imports (like ./app -> ./db/database) have
// already read process.env.DATABASE_URL. `dotenv/config` runs its side effect
// during module evaluation, so putting it first guarantees it runs first too.
import "dotenv/config";

import { createApp } from "./app";
import { migrate } from "./db/database";

const PORT = Number(process.env.PORT) || 4000;

async function start() {
  await migrate();
  const app = createApp();
  app.listen(PORT, () => {
    console.log(`Websume API listening on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exitCode = 1;
});
