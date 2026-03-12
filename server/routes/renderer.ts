import { Router } from "express";
import type { IRNode } from "../../src/ir/types.ts";
import { parseMarkdownToIR } from "../../src/ir/parser.ts";
import { render_node } from "../../src/ir/renderer.ts";

const router = Router();

/**
 * POST /api/render/markdown
 * Body: { markdown: string }
 * Parses markdown to IR then renders to HTML.
 * Returns: { html: string }
 */
router.post("/markdown", (req, res) => {
  const { markdown } = req.body as { markdown?: unknown };

  if (typeof markdown !== "string") {
    res.status(400).json({ error: "Request body must include a 'markdown' string field." });
    return;
  }

  const parseResult = parseMarkdownToIR(markdown);
  if (!parseResult.isOk()) {
    res.status(422).json({ error: parseResult.error.message });
    return;
  }

  const html = parseResult.value.map(render_node).join("");
  res.json({ html });
});

/**
 * POST /api/render/ir
 * Body: { nodes: IRNode[] }
 * Renders a pre-parsed IR node array to HTML.
 * Returns: { html: string }
 */
router.post("/ir", (req, res) => {
  const { nodes } = req.body as { nodes?: unknown };

  if (!Array.isArray(nodes)) {
    res.status(400).json({ error: "Request body must include a 'nodes' array field." });
    return;
  }

  try {
    const html = (nodes as IRNode[]).map(render_node).join("");
    res.json({ html });
  } catch {
    res.status(422).json({ error: "Failed to render IR nodes." });
  }
});

export default router;
