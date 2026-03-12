import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import type { Server } from "node:http";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, afterAll } from "vitest";
import { resetDb } from "../../server/db.ts";
import { createApp } from "../../server/app.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCHEMA = readFileSync(resolve(__dirname, "../../db/schema.sql"), "utf-8");

/**
 * Creates a fresh in-memory SQLite DB + Express server for one test file.
 * Returns helper functions that resolve against the test server's base URL.
 */
export function setupTestServer() {
  let baseUrl: string;
  let server: Server;

  beforeAll(async () => {
    const db = resetDb(":memory:");
    db.exec(SCHEMA);

    const app = createApp();
    server = createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const addr = server.address() as { port: number };
    baseUrl = `http://localhost:${addr.port}`;
  });

  afterAll(
    () =>
      new Promise<void>((resolve, reject) =>
        server.close((err) => (err ? reject(err) : resolve()))
      )
  );

  const get = (path: string, init?: RequestInit) =>
    fetch(`${baseUrl}${path}`, { method: "GET", ...init });

  const post = (path: string, body: unknown, init?: RequestInit) =>
    fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...init?.headers },
      body: JSON.stringify(body),
      ...init,
    });

  const patch = (path: string, body: unknown, init?: RequestInit) =>
    fetch(`${baseUrl}${path}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...init?.headers },
      body: JSON.stringify(body),
      ...init,
    });

  const del = (path: string, init?: RequestInit) =>
    fetch(`${baseUrl}${path}`, { method: "DELETE", ...init });

  /** Extract the name=value portion of a Set-Cookie header for use as a Cookie request header. */
  const cookieFrom = (res: Response) => res.headers.get("set-cookie")?.split(";")[0] ?? "";

  return { get, post, patch, del, cookieFrom };
}
