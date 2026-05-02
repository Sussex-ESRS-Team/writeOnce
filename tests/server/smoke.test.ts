import { describe, it, expect, beforeAll } from "vitest";
import { setupTestServer } from "./helpers";

const { get, post, cookieFrom } = setupTestServer();

describe("smoke: user login and create post", () => {
  let authCookie: string;
  let postId: string;

  beforeAll(async () => {
    const res = await post("/api/auth/signup", { email: "smoke@example.com", password: "password" });
    expect(res.status).toBe(201);
    authCookie = cookieFrom(res);
  });

  it("creates a post when logged in", async () => {
    const createRes = await post(
      "/api/posts",
      { slug: "smoke-post", title: "Smoke Post" },
      { headers: { "Content-Type": "application/json", Cookie: authCookie } },
    );
    if (createRes.status !== 201) {
      const text = await createRes.text().catch(() => "<no body>");
      throw new Error(`Unexpected response ${createRes.status}: ${text}`);
    }
    const body = await createRes.json() as { id: string };
    postId = body.id;

    const getRes = await get(`/api/posts/${postId}`);
    expect(getRes.status).toBe(200);
    const postBody = await getRes.json() as { slug: string; title: string };
    expect(postBody.slug).toBe("smoke-post");
    expect(postBody.title).toBe("Smoke Post");

    // --- Simulate saving: parse some markdown and create a revision ---
    const parseRes = await post(
      "/api/parse",
      { markdown: "# Smoke Save\n\nHello world" },
      { headers: { "Content-Type": "application/json", Cookie: authCookie } },
    );
    expect(parseRes.status).toBe(200);
    const parseBody = await parseRes.json() as { nodes: unknown[] };
    expect(Array.isArray(parseBody.nodes)).toBe(true);

    const revRes = await post(
      `/api/posts/${postId}/revisions`,
      { ir_json: JSON.stringify(parseBody.nodes) },
      { headers: { "Content-Type": "application/json", Cookie: authCookie } },
    );
    expect(revRes.status).toBe(201);
    const revBody = await revRes.json() as { id: string; revision_number: number };
    expect(typeof revBody.id).toBe("string");
    expect(revBody.revision_number).toBeGreaterThanOrEqual(1);
  });
});
