import { describe, it, expect } from "vitest";
import { setupTestServer } from "./helpers.ts";

const { get, post, cookieFrom } = setupTestServer();

describe("POST /api/auth/signup", () => {
  it("creates an account and returns the email", async () => {
    const res = await post("/api/auth/signup", {
      email: "alice@example.com",
      password: "secret",
    });
    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({ email: "alice@example.com" });
  });

  it("sets a session cookie on success", async () => {
    const res = await post("/api/auth/signup", {
      email: "cookie@example.com",
      password: "pw",
    });
    expect(res.headers.get("set-cookie")).toBeTruthy();
  });

  it("returns 409 when the email is already registered", async () => {
    await post("/api/auth/signup", {
      email: "dup@example.com",
      password: "pw",
    });
    const res = await post("/api/auth/signup", {
      email: "dup@example.com",
      password: "pw",
    });
    expect(res.status).toBe(409);
  });

  it("returns 400 when email is missing", async () => {
    const res = await post("/api/auth/signup", { password: "pw" });
    expect(res.status).toBe(400);
  });

  it("returns 400 when password is missing", async () => {
    const res = await post("/api/auth/signup", { email: "nopw@example.com" });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/auth/login", () => {
  it("returns 200 with valid credentials", async () => {
    await post("/api/auth/signup", {
      email: "bob@example.com",
      password: "correct",
    });
    const res = await post("/api/auth/login", {
      email: "bob@example.com",
      password: "correct",
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ email: "bob@example.com" });
  });

  it("returns 401 for wrong password", async () => {
    await post("/api/auth/signup", {
      email: "charlie@example.com",
      password: "right",
    });
    const res = await post("/api/auth/login", {
      email: "charlie@example.com",
      password: "wrong",
    });
    expect(res.status).toBe(401);
  });

  it("returns 401 for unknown email", async () => {
    const res = await post("/api/auth/login", {
      email: "ghost@example.com",
      password: "pw",
    });
    expect(res.status).toBe(401);
  });

  it("returns 400 when fields are missing", async () => {
    const res = await post("/api/auth/login", {});
    expect(res.status).toBe(400);
  });
});

describe("GET /api/auth/me", () => {
  it("returns 401 when no session is active", async () => {
    const res = await get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("returns the email when the session is valid", async () => {
    const signupRes = await post("/api/auth/signup", {
      email: "dave@example.com",
      password: "pw",
    });
    const cookie = cookieFrom(signupRes);

    const res = await get("/api/auth/me", { headers: { Cookie: cookie } });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ email: "dave@example.com" });
  });
});

describe("POST /api/auth/logout", () => {
  it("returns 204 and invalidates the session", async () => {
    const signupRes = await post("/api/auth/signup", {
      email: "eve@example.com",
      password: "pw",
    });
    const cookie = cookieFrom(signupRes);

    const logoutRes = await post(
      "/api/auth/logout",
      {},
      { headers: { Cookie: cookie } },
    );
    expect(logoutRes.status).toBe(204);

    // The same cookie should no longer authenticate
    const meRes = await get("/api/auth/me", { headers: { Cookie: cookie } });
    expect(meRes.status).toBe(401);
  });
});
