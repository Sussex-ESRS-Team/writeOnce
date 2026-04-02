import { Router } from "express";
import { randomUUID } from "crypto";
import { getDb } from "../db.ts";

const router = Router();

/** GET /api/posts - list all posts (newest first) */
router.get("/", (_req, res) => {
  const db = getDb();
  const posts = db
    .prepare("SELECT * FROM posts ORDER BY updated_at DESC")
    .all();
  res.json(posts);
});

/** GET /api/posts/slug/:slug */
router.get("/slug/:slug", (req, res) => {
    const db = getDb();
    const post = db
        .prepare("SELECT * FROM posts WHERE slug = ?")
        .get(req.params.slug);
    if (!post) {
        res.status(404).json({ error: "Post not found." });
        return;
    }
    res.json(post);
});

/** GET /api/posts/:id */
router.get("/:id", (req, res) => {
  const db = getDb();
  const post = db
    .prepare("SELECT * FROM posts WHERE id = ?")
    .get(req.params.id);
  if (!post) {
    res.status(404).json({ error: "Post not found." });
    return;
  }
  res.json(post);
});

/** POST /api/posts - create a post */
router.post("/", (req, res) => {
  const { slug, title, created_by } = req.body as {
    slug?: unknown;
    title?: unknown;
    created_by?: unknown;
  };

  if (
    typeof slug !== "string" ||
    typeof title !== "string" ||
    typeof created_by !== "string"
  ) {
    res.status(400).json({
      error: "'slug', 'title', and 'created_by' string fields are required.",
    });
    return;
  }

  const db = getDb();
  const id = randomUUID();
  const now = new Date().toISOString();

  db.prepare(
    "INSERT INTO posts (id, slug, title, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
  ).run(id, slug, title, created_by, now, now);

  res.status(201).json({ id });
});

/** PATCH /api/posts/:id - update title/slug or publish a revision */
router.patch("/:id", (req, res) => {
  const db = getDb();
  const { slug, title, published_revision_id } = req.body as {
    slug?: unknown;
    title?: unknown;
    published_revision_id?: unknown;
  };

  const post = db
    .prepare("SELECT * FROM posts WHERE id = ?")
    .get(req.params.id);
  if (!post) {
    res.status(404).json({ error: "Post not found." });
    return;
  }

  const now = new Date().toISOString();
  const fields: string[] = ["updated_at = ?"];
  const values: string[] = [now];

  if (typeof slug === "string") {
    fields.push("slug = ?");
    values.push(slug);
  }
  if (typeof title === "string") {
    fields.push("title = ?");
    values.push(title);
  }
  if (typeof published_revision_id === "string") {
    const rev = db
      .prepare("SELECT id FROM post_revisions WHERE id = ? AND post_id = ?")
      .get(published_revision_id, req.params.id);
    if (!rev) {
      res.status(422).json({ error: "Revision does not belong to this post." });
      return;
    }
    fields.push("published_revision_id = ?", "published_at = ?");
    values.push(published_revision_id, now);
  }

  values.push(req.params.id);
  db.prepare(`UPDATE posts SET ${fields.join(", ")} WHERE id = ?`).run(
    ...values,
  );
  res.status(204).send();
});

/** DELETE /api/posts/:id */
router.delete("/:id", (req, res) => {
  const db = getDb();
  const result = db
    .prepare("DELETE FROM posts WHERE id = ?")
    .run(req.params.id);
  if (result.changes === 0) {
    res.status(404).json({ error: "Post not found." });
    return;
  }
  res.status(204).send();
});

export default router;
