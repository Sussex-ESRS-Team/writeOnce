import { Router } from "express";
import type { Request, Response } from "express";
import { randomUUID } from "crypto";
import { getDb } from "../db.ts";

const router = Router({ mergeParams: true });

const IR_SCHEMA_VERSION = 1;

type PostParams = { postId: string };
type RevisionParams = { postId: string; revisionId: string };

/** GET /api/posts/:postId/revisions - list revisions for a post */
router.get("/", (req: Request<PostParams>, res: Response) => {
  const db = getDb();
  const revisions = db
    .prepare(
      "SELECT id, post_id, revision_number, created_by, created_at, ir_schema_version, ir_json FROM post_revisions WHERE post_id = ? ORDER BY revision_number DESC",
    )
    .all(req.params.postId);
  res.json(revisions);
});

/** GET /api/posts/:postId/revisions/:revisionId */
router.get("/:revisionId", (req: Request<RevisionParams>, res: Response) => {
  const db = getDb();
  const revision = db
    .prepare("SELECT * FROM post_revisions WHERE id = ? AND post_id = ?")
    .get(req.params.revisionId, req.params.postId);
  if (!revision) {
    res.status(404).json({ error: "Revision not found." });
    return;
  }
  res.json(revision);
});

/** POST /api/posts/:postId/revisions - create a new revision */
router.post("/", (req: Request<PostParams>, res: Response) => {
  const { ir_json } = req.body as {
    ir_json?: unknown;
  };

  const email = req.session.userEmail;
  if (!email) {
    res.status(401).json({ error: "Not logged in." });
    return;
  }

  if (
    typeof ir_json !== "string" &&
    (typeof ir_json !== "object" || ir_json === null)
  ) {
    res
      .status(400)
      .json({ error: "'ir_json' field is required (string or object)." });
    return;
  }

  const db = getDb();

  const post = db
    .prepare("SELECT id FROM posts WHERE id = ?")
    .get(req.params.postId);
  if (!post) {
    res.status(404).json({ error: "Post not found." });
    return;
  }

  const lastRevision = db
      .prepare(
          "SELECT revision_number FROM post_revisions WHERE post_id = ? ORDER BY revision_number DESC LIMIT 1",
      )
      .get(req.params.postId) as { revision_number: number } | undefined;

  const revision_number = (lastRevision?.revision_number ?? 0) + 1;
  const id = randomUUID();
  const created_at = new Date().toISOString();
  const ir_json_str =
      typeof ir_json === "string" ? ir_json : JSON.stringify(ir_json);

  const user = db.prepare("SELECT id FROM users WHERE email = ?").get(email) as
    | { id: string }
    | undefined;
  if (!user) {
    res.status(401).json({ error: "Not logged in." });
    return;
  }

  const insert = db.prepare(
      "INSERT INTO post_revisions (id, post_id, revision_number, created_by, created_at, ir_schema_version, ir_json) VALUES (?, ?, ?, ?, ?, ?, ?)",
  );
  const updatePost = db.prepare(
      "UPDATE posts SET updated_at = ? WHERE id = ?",
  );

  db.exec("BEGIN");
  try {
    insert.run(
      id,
      req.params.postId,
      revision_number,
      user.id,
      created_at,
      IR_SCHEMA_VERSION,
      ir_json_str,
    );
    updatePost.run(created_at, req.params.postId);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  res.status(201).json({ id, revision_number });
});

/** DELETE /api/posts/:postId/revisions/:revisionId */
router.delete("/:revisionId", (req: Request<RevisionParams>, res: Response) => {
  const db = getDb();
  const result = db
    .prepare("DELETE FROM post_revisions WHERE id = ? AND post_id = ?")
    .run(req.params.revisionId, req.params.postId);
  if (result.changes === 0) {
    res.status(404).json({ error: "Revision not found." });
    return;
  }
  res.status(204).send();
});

export default router;
