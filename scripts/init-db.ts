/**
 * WriteOnce Blog Engine - DB Initialisation Script
 * Run with: npm run db:init
 *
 * Creates writeonce.db from schema.sql if it doesn't already exist.
 */

import { existsSync, readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { DatabaseSync } from "node:sqlite";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const DB_PATH = resolve(ROOT, "writeonce.db");
const SCHEMA_PATH = resolve(ROOT, "db/schema.sql");

if (existsSync(DB_PATH)) {
  console.log(`[info] Database already exists at '${DB_PATH}'. Nothing to do.`);
  process.exit(0);
}

console.log("[info] Initialising database...");

const schema = readFileSync(SCHEMA_PATH, "utf-8");
const db = new DatabaseSync(DB_PATH);

try {
  db.exec(schema);
  console.log(`[ok] Database created at '${DB_PATH}'`);
} catch (err) {
  console.error("[error] Failed to initialise database:", err);
  process.exit(1);
} finally {
  db.close();
}
