import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = resolve(__dirname, "..", "db", "writeonce.db");
const SCHEMA_PATH = resolve(__dirname, "..", "db", "schema.sql");

let _db: DatabaseSync | null = null;

function initializeSchemaIfEmpty(db: DatabaseSync): void {
  const row = db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'users'",
    )
    .get() as { name: string } | undefined;

  if (!row) {
    const schema = readFileSync(SCHEMA_PATH, "utf-8");
    db.exec(schema);
  }
}

export function getDb(): DatabaseSync {
  if (!_db) {
    _db = new DatabaseSync(DB_PATH);
    _db.exec("PRAGMA foreign_keys = ON;");
    _db.exec("PRAGMA journal_mode = WAL;");
    initializeSchemaIfEmpty(_db);
  }
  return _db;
}

/** Replace the active DB connection. Pass ":memory:" for an isolated in-memory DB (tests). */
export function resetDb(path: string = DB_PATH): DatabaseSync {
  if (_db) {
    _db.close();
    _db = null;
  }
  _db = new DatabaseSync(path);
  _db.exec("PRAGMA foreign_keys = ON;");
  if (path !== ":memory:") {
    _db.exec("PRAGMA journal_mode = WAL;");
  }
  return _db;
}
