-- WriteOnce Blog Engine - SQLite Schema
-- Compatible with SQLite 3.x
-- UUIDs stored as TEXT, timestamps as ISO-8601 TEXT

PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;  -- Better concurrent read performance

-- ─── Users ────────────────────────────────────────────────────────────────────

CREATE TABLE users (
  id            TEXT PRIMARY KEY,
  hanko_user_id TEXT NOT NULL UNIQUE,
  email         TEXT,
  display_name  TEXT,
  created_at    TEXT NOT NULL
);

-- ─── Posts ────────────────────────────────────────────────────────────────────

CREATE TABLE posts (
  id                    TEXT PRIMARY KEY,
  slug                  TEXT NOT NULL UNIQUE,
  title                 TEXT NOT NULL,
  created_by            TEXT NOT NULL,
  created_at            TEXT NOT NULL,
  updated_at            TEXT NOT NULL,

  published_revision_id TEXT,
  published_at          TEXT,

  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX posts_slug_idx         ON posts(slug);
CREATE INDEX posts_published_at_idx ON posts(published_at);
CREATE INDEX posts_updated_at_idx   ON posts(updated_at);

-- ─── Post Revisions ───────────────────────────────────────────────────────────

CREATE TABLE post_revisions (
  id               TEXT PRIMARY KEY,
  post_id          TEXT    NOT NULL,
  revision_number  INTEGER NOT NULL,
  created_by       TEXT    NOT NULL,
  created_at       TEXT    NOT NULL,

  ir_schema_version INTEGER NOT NULL,
  ir_json           TEXT    NOT NULL,

  FOREIGN KEY (post_id)    REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id),
  UNIQUE (post_id, revision_number)
);

CREATE INDEX post_revisions_post_id_idx ON post_revisions(post_id);

-- ─── Deferred FK: posts.published_revision_id -> post_revisions.id ────────────
-- SQLite doesn't support ADD CONSTRAINT after CREATE, but the FK check is
-- enforced at runtime via the trigger below.

CREATE TRIGGER fk_posts_published_revision
  BEFORE UPDATE OF published_revision_id ON posts
  FOR EACH ROW
  WHEN NEW.published_revision_id IS NOT NULL
BEGIN
  SELECT RAISE(ABORT, 'published_revision_id references a non-existent post_revision')
  WHERE NOT EXISTS (
    SELECT 1 FROM post_revisions
    WHERE id = NEW.published_revision_id
      AND post_id = NEW.id
  );
END;
