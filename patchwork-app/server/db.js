// SQLite database (Node's built-in node:sqlite — no native build step).
import { DatabaseSync } from 'node:sqlite';
import { accessSync, constants, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
// Hugging Face persistent storage mounts at /data; use it when present so data survives restarts.
const hfData = (() => { try { accessSync('/data', constants.W_OK); return '/data/patchwork.db'; } catch { return null; } })();
export const DB_PATH = process.env.PATCHWORK_DB || hfData || join(here, '..', 'data', 'patchwork.db');
mkdirSync(dirname(DB_PATH), { recursive: true });

export const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  interests     TEXT NOT NULL DEFAULT '[]',          -- JSON array of interest keys
  skill_level   TEXT NOT NULL DEFAULT 'Beginner',    -- Beginner | Comfortable | Experienced
  onboarded     INTEGER NOT NULL DEFAULT 0,
  preferences   TEXT NOT NULL DEFAULT '{}',          -- JSON: time, budget, difficulty, type
  settings      TEXT NOT NULL DEFAULT '{}',          -- JSON: notifications + accessibility
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  token      TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS password_resets (
  token      TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS resources (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  category   TEXT NOT NULL,     -- Fabric | Paper | Glass | Electronics | Food | Tools | Garden | Custom
  quantity   REAL NOT NULL DEFAULT 1,
  unit       TEXT NOT NULL DEFAULT 'pieces',
  condition  TEXT NOT NULL DEFAULT 'Good',  -- New | Good | Worn | Needs repair
  location   TEXT NOT NULL DEFAULT '',
  notes      TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Idea catalogue (seeded). materials/steps/substitutes/tags are JSON.
CREATE TABLE IF NOT EXISTS ideas (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  summary     TEXT NOT NULL,
  category    TEXT NOT NULL,   -- home | food | tech | art | repair | garden
  minutes     INTEGER NOT NULL,
  difficulty  TEXT NOT NULL,   -- Easy | Medium | Hard
  materials   TEXT NOT NULL,
  steps       TEXT NOT NULL,
  substitutes TEXT NOT NULL DEFAULT '[]',
  tags        TEXT NOT NULL DEFAULT '[]',
  safety      TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS saved_ideas (
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  idea_id    TEXT NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, idea_id)
);

CREATE TABLE IF NOT EXISTS goals (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text       TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS projects (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  idea_id        TEXT NOT NULL REFERENCES ideas(id),
  goal_id        INTEGER REFERENCES goals(id) ON DELETE SET NULL,
  title          TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'active',  -- active | completed
  steps_done     TEXT NOT NULL DEFAULT '[]',      -- JSON array of booleans
  substitutions  TEXT NOT NULL DEFAULT '[]',      -- JSON: chosen substitutes
  budget         INTEGER NOT NULL DEFAULT 0,
  cost_recorded  INTEGER,
  reused_items   TEXT NOT NULL DEFAULT '[]',      -- JSON: [{resourceId,name,qty}]
  notes          TEXT NOT NULL DEFAULT '',
  started_at     TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at   TEXT
);

CREATE TABLE IF NOT EXISTS stories (
  id        TEXT PRIMARY KEY,
  title     TEXT NOT NULL,
  author    TEXT NOT NULL,
  category  TEXT NOT NULL,
  idea_id   TEXT REFERENCES ideas(id),
  summary   TEXT NOT NULL,
  body      TEXT NOT NULL,
  lesson    TEXT NOT NULL
);
`);

// ---- helpers ----
export const json = (s, fallback) => { try { return JSON.parse(s); } catch { return fallback; } };

export function tx(fn) {
  db.exec('BEGIN');
  try { const r = fn(); db.exec('COMMIT'); return r; } catch (e) { db.exec('ROLLBACK'); throw e; }
}
