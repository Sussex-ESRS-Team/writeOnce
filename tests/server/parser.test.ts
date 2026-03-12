import { describe, it, expect } from "vitest";
import { setupTestServer } from "./helpers.ts";

const { post } = setupTestServer();

describe("POST /api/parse", () => {
  it("parses valid markdown and returns IR nodes", async () => {
    const res = await post("/api/parse", { markdown: "# Hello\n\nA paragraph." });
    expect(res.status).toBe(200);
    const body = await res.json() as { nodes: unknown[] };
    expect(Array.isArray(body.nodes)).toBe(true);
    expect(body.nodes.length).toBeGreaterThan(0);
  });

  it("returns 400 when markdown field is missing", async () => {
    const res = await post("/api/parse", {});
    expect(res.status).toBe(400);
  });

  it("returns 400 when markdown is not a string", async () => {
    const res = await post("/api/parse", { markdown: 42 });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/render/markdown", () => {
  it("renders valid markdown to HTML", async () => {
    const res = await post("/api/render/markdown", { markdown: "# Hi\n\nWorld." });
    expect(res.status).toBe(200);
    const body = await res.json() as { html: string };
    expect(typeof body.html).toBe("string");
    expect(body.html.length).toBeGreaterThan(0);
  });

  it("returns 400 when markdown field is missing", async () => {
    const res = await post("/api/render/markdown", {});
    expect(res.status).toBe(400);
  });
});

describe("POST /api/render/ir", () => {
  it("renders a pre-parsed IR node array to HTML", async () => {
    // First parse some markdown to get a valid IR node array
    const parseRes = await post("/api/parse", { markdown: "# Title\n\nBody text." });
    const { nodes } = await parseRes.json() as { nodes: unknown[] };

    const res = await post("/api/render/ir", { nodes });
    expect(res.status).toBe(200);
    const body = await res.json() as { html: string };
    expect(typeof body.html).toBe("string");
    expect(body.html.length).toBeGreaterThan(0);
  });

  it("returns 400 when nodes is not an array", async () => {
    const res = await post("/api/render/ir", { nodes: "not-an-array" });
    expect(res.status).toBe(400);
  });

  it("returns 400 when nodes field is missing", async () => {
    const res = await post("/api/render/ir", {});
    expect(res.status).toBe(400);
  });
});
