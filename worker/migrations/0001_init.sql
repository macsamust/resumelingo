CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  passwordHash TEXT NOT NULL,
  profession TEXT,
  subscriptionTier TEXT NOT NULL DEFAULT 'starter',
  createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS resumes (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  profession TEXT NOT NULL,
  templateKey TEXT NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'public',
  accessPassword TEXT,
  answers TEXT NOT NULL DEFAULT '{}',
  generatedSummary TEXT NOT NULL DEFAULT '',
  generatedBullets TEXT NOT NULL DEFAULT '[]',
  viewCount INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  FOREIGN KEY (userId) REFERENCES users(id)
);
