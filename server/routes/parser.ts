import { Router } from "express";
import { parseMarkdownToIR } from "../../src/ir/markdown_parser.ts";
import { parseHtmlToIR } from "../../src/ir/html_parser.ts";

const router = Router();

/**
 * POST /api/parse/markdown
 * Body: { markdown: string }
 * Returns: { nodes: IRNode[] }
 */
router.post("/markdown", (req, res) => {
  const { markdown } = req.body as { markdown?: unknown };

  if (typeof markdown !== "string") {
    res
      .status(400)
      .json({ error: "Request body must include a 'markdown' string field." });
    return;
  }

  const result = parseMarkdownToIR(markdown);

  if (result.isOk()) {
    res.json({ nodes: result.value });
  } else {
    res.status(422).json({ error: result.error.message });
  }
});

/**
 * POST /api/parse/html
 * Body: { html: string }
 * Returns: { nodes: IRNode[] }
 */
router.post("/html", (req, res) => {
  const { html } = req.body as { html?: unknown };

  if (typeof html !== "string") {
    res
      .status(400)
      .json({ error: "Request body must include an 'html' string field." });
    return;
  }

  const result = parseHtmlToIR(html);

  if (result.isOk()) {
    res.json({ nodes: result.value });
  } else {
    res.status(422).json({ error: result.error.message });
  }
});

export default router;
