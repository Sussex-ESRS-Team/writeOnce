import { describe, it, expect, beforeAll } from "vitest";
import { setupTestServer } from "./helpers.ts";

const { get, post, patch, del } = setupTestServer();

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

describe("POST /api/users", () => {
  it("creates a user and returns the id", async () => {
    const res = await post("/api/users", { hanko_user_id: "hanko-1", email: "a@example.com" });
    expect(res.status).toBe(201);
    const body = await res.json() as { id: string };
    expect(typeof body.id).toBe("string");
  });

  it("returns 400 when hanko_user_id is missing", async () => {
    const res = await post("/api/users", { email: "no-hanko@example.com" });
    expect(res.status).toBe(400);
  });
});

describe("GET /api/users", () => {
  it("returns an array", async () => {
    const res = await get("/api/users");
    expect(res.status).toBe(200);
    expect(Array.isArray(await res.json())).toBe(true);
  });
});

describe("GET /api/users/:id", () => {
  it("returns 404 for unknown id", async () => {
    const res = await get("/api/users/does-not-exist");
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/users/:id", () => {
  it("returns 404 for unknown id", async () => {
    const res = await del("/api/users/does-not-exist");
    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// Posts — requires a user in the DB first
// ---------------------------------------------------------------------------

let userId: string;
let postId: string;

beforeAll(async () => {
  const res = await post("/api/users", { hanko_user_id: "hanko-posts", email: "posts@example.com" });
  ({ id: userId } = await res.json() as { id: string });
});

describe("POST /api/posts", () => {
  it("creates a post and returns its id", async () => {
    const res = await post("/api/posts", {
      slug: "first-post",
      title: "First Post",
      created_by: userId,
    });
    expect(res.status).toBe(201);
    const body = await res.json() as { id: string };
    postId = body.id;
    expect(typeof postId).toBe("string");
  });

  it("returns 400 when required fields are missing", async () => {
    const res = await post("/api/posts", { title: "No slug or author" });
    expect(res.status).toBe(400);
  });
});

describe("GET /api/posts", () => {
  it("returns an array", async () => {
    const res = await get("/api/posts");
    expect(res.status).toBe(200);
    expect(Array.isArray(await res.json())).toBe(true);
  });
});

describe("GET /api/posts/:id", () => {
  it("returns the post", async () => {
    const res = await get(`/api/posts/${postId}`);
    expect(res.status).toBe(200);
    const body = await res.json() as { slug: string };
    expect(body.slug).toBe("first-post");
  });

  it("returns 404 for unknown id", async () => {
    const res = await get("/api/posts/does-not-exist");
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/posts/:id", () => {
  it("updates the title", async () => {
    const res = await patch(`/api/posts/${postId}`, { title: "Updated Title" });
    expect(res.status).toBe(204);

    const check = await get(`/api/posts/${postId}`);
    const body = await check.json() as { title: string };
    expect(body.title).toBe("Updated Title");
  });

  it("returns 404 for unknown id", async () => {
    const res = await patch("/api/posts/does-not-exist", { title: "x" });
    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// Revisions — under /api/posts/:postId/revisions
// ---------------------------------------------------------------------------

let revisionId: string;

describe("POST /api/posts/:postId/revisions", () => {
  it("creates a revision and returns id + revision_number", async () => {
    const res = await post(`/api/posts/${postId}/revisions`, {
      created_by: userId,
      ir_json: JSON.stringify([{ kind: "Header", level: 1, content: ["Hello"] }]),
    });
    expect(res.status).toBe(201);
    const body = await res.json() as { id: string; revision_number: number };
    revisionId = body.id;
    expect(body.revision_number).toBe(1);
  });

  it("auto-increments revision_number", async () => {
    const res = await post(`/api/posts/${postId}/revisions`, {
      created_by: userId,
      ir_json: "{}",
    });
    const body = await res.json() as { revision_number: number };
    expect(body.revision_number).toBe(2);
  });

  it("returns 404 when the post does not exist", async () => {
    const res = await post("/api/posts/no-such-post/revisions", {
      created_by: userId,
      ir_json: "{}",
    });
    expect(res.status).toBe(404);
  });

  it("returns 400 when created_by is missing", async () => {
    const res = await post(`/api/posts/${postId}/revisions`, { ir_json: "{}" });
    expect(res.status).toBe(400);
  });
});

describe("GET /api/posts/:postId/revisions", () => {
  it("returns the list of revisions", async () => {
    const res = await get(`/api/posts/${postId}/revisions`);
    expect(res.status).toBe(200);
    const body = await res.json() as unknown[];
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThanOrEqual(1);
  });
});

describe("GET /api/posts/:postId/revisions/:revisionId", () => {
  it("returns the revision", async () => {
    const res = await get(`/api/posts/${postId}/revisions/${revisionId}`);
    expect(res.status).toBe(200);
  });

  it("returns 404 for unknown revision", async () => {
    const res = await get(`/api/posts/${postId}/revisions/no-such-rev`);
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/posts/:postId/revisions/:revisionId", () => {
  it("deletes the revision and returns 204", async () => {
    const res = await del(`/api/posts/${postId}/revisions/${revisionId}`);
    expect(res.status).toBe(204);

    const check = await get(`/api/posts/${postId}/revisions/${revisionId}`);
    expect(check.status).toBe(404);
  });
});

describe("DELETE /api/posts/:id", () => {
  it("deletes the post and cascades to revisions", async () => {
    const res = await del(`/api/posts/${postId}`);
    expect(res.status).toBe(204);

    const check = await get(`/api/posts/${postId}`);
    expect(check.status).toBe(404);
  });
});
