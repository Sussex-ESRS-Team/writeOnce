import { Router } from "express";
import { randomUUID } from "crypto";
import { getDb } from "../db.ts";

const router = Router();

/** GET /api/users - list all users */
router.get("/", (_req, res) => {
  const db = getDb();
  const users = db.prepare("SELECT * FROM users ORDER BY created_at DESC").all();
  res.json(users);
});

/** GET /api/users/:id */
router.get("/:id", (req, res) => {
  const db = getDb();
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.params.id);
  if (!user) {
    res.status(404).json({ error: "User not found." });
    return;
  }
  res.json(user);
});

/** POST /api/users - create a user */
router.post("/", (req, res) => {
  const { hanko_user_id, email, display_name } = req.body as {
    hanko_user_id?: unknown;
    email?: unknown;
    display_name?: unknown;
  };

  if (typeof hanko_user_id !== "string") {
    res.status(400).json({ error: "'hanko_user_id' string field is required." });
    return;
  }

  const db = getDb();
  const id = randomUUID();
  const created_at = new Date().toISOString();

  db.prepare(
    "INSERT INTO users (id, hanko_user_id, email, display_name, created_at) VALUES (?, ?, ?, ?, ?)"
  ).run(
    id,
    hanko_user_id,
    typeof email === "string" ? email : null,
    typeof display_name === "string" ? display_name : null,
    created_at
  );

  res.status(201).json({ id });
});

/** DELETE /api/users/:id */
router.delete("/:id", (req, res) => {
  const db = getDb();
  const result = db.prepare("DELETE FROM users WHERE id = ?").run(req.params.id);
  if (result.changes === 0) {
    res.status(404).json({ error: "User not found." });
    return;
  }
  res.status(204).send();
});

export default router;
