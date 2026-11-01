import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

// One SQLite file, opened once per process. Node's built-in driver: nothing native to compile.
// LAUDWALL_DB=":memory:" gives tests a fresh database.
const MIGRATIONS = [
  `CREATE TABLE users (
     id INTEGER PRIMARY KEY,
     email TEXT NOT NULL UNIQUE COLLATE NOCASE,
     name TEXT NOT NULL,
     password_hash TEXT NOT NULL,
     created_at TEXT NOT NULL DEFAULT (datetime('now'))
   );
   CREATE TABLE sessions (
     token_hash TEXT PRIMARY KEY,
     user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     expires_at TEXT NOT NULL
   );
   CREATE TABLE spaces (
     id INTEGER PRIMARY KEY,
     user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     slug TEXT NOT NULL UNIQUE,
     name TEXT NOT NULL,
     question TEXT NOT NULL,
     thank_you TEXT NOT NULL,
     accent TEXT NOT NULL DEFAULT '#4f46e5',
     created_at TEXT NOT NULL DEFAULT (datetime('now'))
   );
   CREATE TABLE testimonials (
     id INTEGER PRIMARY KEY,
     space_id INTEGER NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
     author TEXT NOT NULL,
     role TEXT NOT NULL DEFAULT '',
     body TEXT NOT NULL,
     rating INTEGER NOT NULL DEFAULT 5,
     source TEXT NOT NULL DEFAULT 'form',
     status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
     featured INTEGER NOT NULL DEFAULT 0,
     created_at TEXT NOT NULL DEFAULT (datetime('now'))
   );
   CREATE INDEX testimonials_space ON testimonials(space_id, status);
   CREATE TABLE api_keys (
     id INTEGER PRIMARY KEY,
     user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     name TEXT NOT NULL,
     prefix TEXT NOT NULL,
     key_hash TEXT NOT NULL UNIQUE,
     last_used_at TEXT,
     created_at TEXT NOT NULL DEFAULT (datetime('now'))
   );`,
];

function open(): DatabaseSync {
  const file = process.env.LAUDWALL_DB ?? "data/laudwall.db";
  if (file !== ":memory:") mkdirSync(dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
  const version = (db.prepare("PRAGMA user_version").get() as { user_version: number }).user_version;
  for (let v = version; v < MIGRATIONS.length; v++) {
    db.exec("BEGIN");
    db.exec(MIGRATIONS[v]);
    db.exec(`PRAGMA user_version = ${v + 1}`);
    db.exec("COMMIT");
  }
  return db;
}

const g = globalThis as unknown as { __laudwallDb?: DatabaseSync };

export function db(): DatabaseSync {
  return (g.__laudwallDb ??= open());
}

/** Tests only: drop the open database so the next call starts clean. */
export function resetDb(): void {
  g.__laudwallDb?.close();
  g.__laudwallDb = undefined;
}
