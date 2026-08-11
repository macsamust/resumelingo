-- Minimal admins table, split out ahead of the full admin-console port
-- (a separate, larger phase) specifically so the existing local-dev admin
-- account has somewhere to land during the one-time Postgres -> D1 data
-- migration. Matches server/'s "admins" table exactly (see
-- server/src/db/database.ts) — admin auth/routes themselves aren't wired
-- up in worker/ yet, this is just the storage.
CREATE TABLE IF NOT EXISTS admins (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  passwordHash TEXT NOT NULL,
  createdAt TEXT NOT NULL
);
