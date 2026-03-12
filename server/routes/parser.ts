import { Router } from "express";
import { parseMarkdownToIR } from "../../src/ir/markdown_parser.ts";

const router = Router();

/**
 * POST /api/parse
 * Body: { markdown: string }
 * Returns: { nodes: IRNode[] }
 */
router.post("/", (req, res) => {
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

export default router;
