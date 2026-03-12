import { Router } from "express";
import { pbkdf2Sync } from "node:crypto";
import { randomUUID } from "node:crypto";
import { getDb } from "../db.ts";

// Matches the PBKDF2 parameters used in the original client-side prototype.
const SALT = "writeonce-salt";
const ITERATIONS = 100000;
const KEY_LEN = 32;
const DIGEST = "sha256";

function hashPassword(password: string): string {
  return pbkdf2Sync(password, SALT, ITERATIONS, KEY_LEN, DIGEST).toString(
    "hex",
  );
}

const router = Router();

/** POST /api/auth/signup */
router.post("/signup", (req, res) => {
  const { email, password } = req.body as {
    email?: unknown;
    password?: unknown;
  };

  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    !email ||
    !password
  ) {
    res.status(400).json({ error: "email and password are required." });
    return;
  }

  const db = getDb();
  const existing = db
    .prepare("SELECT email FROM user_credentials WHERE email = ?")
    .get(email);

  if (existing) {
    res.status(409).json({ error: "Account already exists with this email." });
    return;
  }

  const userId = randomUUID();
  const now = new Date().toISOString();
  const hash = hashPassword(password);

  db.exec("BEGIN");
  try {
    db.prepare(
      "INSERT INTO users (id, hanko_user_id, email, created_at) VALUES (?, ?, ?, ?)",
    ).run(userId, email, email, now);
    db.prepare(
      "INSERT INTO user_credentials (email, password_hash, user_id) VALUES (?, ?, ?)",
    ).run(email, hash, userId);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  req.session.userEmail = email;
  res.status(201).json({ email });
});

/** POST /api/auth/login */
router.post("/login", (req, res) => {
  const { email, password } = req.body as {
    email?: unknown;
    password?: unknown;
  };

  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    !email ||
    !password
  ) {
    res.status(400).json({ error: "email and password are required." });
    return;
  }

  const db = getDb();
  const cred = db
    .prepare("SELECT password_hash FROM user_credentials WHERE email = ?")
    .get(email) as { password_hash: string } | undefined;

  if (!cred || hashPassword(password) !== cred.password_hash) {
    res.status(401).json({ error: "Invalid email or password." });
    return;
  }

  req.session.userEmail = email;
  res.json({ email });
});

/** POST /api/auth/logout */
router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.status(204).send();
  });
});

/** GET /api/auth/me - check current session */
router.get("/me", (req, res) => {
  if (!req.session.userEmail) {
    res.status(401).json({ error: "Not logged in." });
    return;
  }
  res.json({ email: req.session.userEmail });
});

export default router;
