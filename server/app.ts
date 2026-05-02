import express from "express";
import session from "express-session";
import parserRouter from "./routes/parser.ts";
import rendererRouter from "./routes/renderer.ts";
import usersRouter from "./routes/users.ts";
import postsRouter from "./routes/posts.ts";
import revisionsRouter from "./routes/revisions.ts";
import authRouter from "./routes/auth.ts";

declare module "express-session" {
  interface SessionData {
    userEmail: string;
  }
}

export function createApp() {
  const app = express();

  app.use(express.json());
  app.use(
    session({
      secret: process.env.SESSION_SECRET ?? "writeonce-dev-secret",
      resave: false,
      saveUninitialized: false,
      cookie: { httpOnly: true, sameSite: "lax" },
    }),
  );

  app.use("/api/auth", authRouter);
  app.use("/api/parse", parserRouter);
  app.use("/api/render", rendererRouter);
  app.use("/api/users", usersRouter);
  app.use("/api/posts", postsRouter);
  app.use("/api/posts/:postId/revisions", revisionsRouter);

  // JSON error handler — convert thrown errors to clean JSON responses
  // (err, req, res, next) signature is required by Express to mark it as error handler
  app.use((err: unknown, _req: import("express").Request, res: import("express").Response, next: import("express").NextFunction) => {
    // eslint-disable-next-line no-console
    console.error(err);
    if (res.headersSent) return next(err as Error);
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  });

  return app;
}
