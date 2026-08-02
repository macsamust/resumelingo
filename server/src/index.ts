import dotenv from "dotenv";
dotenv.config();

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
