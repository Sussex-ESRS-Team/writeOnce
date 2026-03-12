import { createApp } from "./app.ts";

const PORT = process.env.PORT ?? 3000;

createApp().listen(PORT, () => {
  console.log(`[server] Running at http://localhost:${PORT}`);
});
