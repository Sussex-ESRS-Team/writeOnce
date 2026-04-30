import { describe, it, expect } from "vitest";
import { markdownRenderer } from "../../src/ir/markdown_renderer";
import type {
  HeaderNode,
  ParagraphNode,
  CodeBlockNode,
  BulletBlock,
  NumberedBlock,
  BulletItemNode,
  IRDocument,
} from "../../src/ir/types";

// ---------------------------------------------------------------------------
// markdownRenderer
// ---------------------------------------------------------------------------

describe("markdownRenderer", () => {
  // ---------------------------------------------------------------------------
  // renderSpan
  // ---------------------------------------------------------------------------

  describe("renderSpan", () => {
    it("renders plain text unchanged", () => {
      expect(markdownRenderer.renderSpan("hello world")).toBe("hello world");
    });

    it("renders emphasis with asterisks", () => {
      expect(
        markdownRenderer.renderSpan({ kind: "Emphasis", content: ["italic"] }),
      ).toBe("*italic*");
    });

    it("renders strong with double asterisks", () => {
      expect(
        markdownRenderer.renderSpan({ kind: "Strong", content: ["bold"] }),
      ).toBe("**bold**");
    });

    it("renders inline code with backticks", () => {
      expect(
        markdownRenderer.renderSpan({ kind: "Code", code: "const x = 1" }),
      ).toBe("`const x = 1`");
    });

    it("renders a link", () => {
      expect(
        markdownRenderer.renderSpan({
          kind: "Link",
          href: "https://example.com",
          content: ["click here"],
        }),
      ).toBe("[click here](https://example.com)");
    });

    it("renders emphasis nested inside strong", () => {
      const span = {
        kind: "Strong" as const,
        content: [
          "really ",
          { kind: "Emphasis" as const, content: ["very"] },
          " important",
        ],
      };
      expect(markdownRenderer.renderSpan(span)).toBe(
        "**really *very* important**",
      );
    });

    it("renders strong nested inside emphasis", () => {
      const span = {
        kind: "Emphasis" as const,
        content: [{ kind: "Strong" as const, content: ["bold"] }],
      };
      expect(markdownRenderer.renderSpan(span)).toBe("***bold***");
    });

    it("renders a link with emphasis content", () => {
      const span = {
        kind: "Link" as const,
        href: "https://test.com",
        content: [{ kind: "Emphasis" as const, content: ["styled"] }],
      };
      expect(markdownRenderer.renderSpan(span)).toBe(
        "[*styled*](https://test.com)",
      );
    });

    it("renders an image without alt text as a wiki link", () => {
      expect(
        markdownRenderer.renderSpan({ kind: "InlineImage", href: "./img/cat.png" }),
      ).toBe("![[./img/cat.png]]");
    });

    it("renders an image with alt text as markdown image syntax", () => {
      expect(
        markdownRenderer.renderSpan({
          kind: "InlineImage",
          href: "https://example.com/cat.png",
          alt: "Cat",
        }),
      ).toBe("![Cat](https://example.com/cat.png)");
    });

    it("renders empty emphasis markers for empty content", () => {
      expect(
        markdownRenderer.renderSpan({ kind: "Emphasis", content: [] }),
      ).toBe("**");
    });
  });

  // ---------------------------------------------------------------------------
  // renderLine
  // ---------------------------------------------------------------------------

  describe("renderLine", () => {
    it("renders a line with a single plain string", () => {
      expect(markdownRenderer.renderLine(["Simple text"])).toBe("Simple text");
    });

    it("renders a line with multiple spans", () => {
      const line = [
        "This is ",
        { kind: "Strong" as const, content: ["bold"] },
        " and ",
        { kind: "Emphasis" as const, content: ["italic"] },
      ];
      expect(markdownRenderer.renderLine(line)).toBe(
        "This is **bold** and *italic*",
      );
    });

    it("renders an empty line as empty string", () => {
      expect(markdownRenderer.renderLine([])).toBe("");
    });

    it("renders a line with only a code span", () => {
      expect(
        markdownRenderer.renderLine([{ kind: "Code", code: "fn()" }]),
      ).toBe("`fn()`");
    });
  });

  // ---------------------------------------------------------------------------
  // renderHeader
  // ---------------------------------------------------------------------------

  describe("renderHeader", () => {
    it("renders a level-1 header", () => {
      const header: HeaderNode = {
        kind: "Header",
        level: 1,
        content: ["Hello World"],
      };
      expect(markdownRenderer.renderHeader(header)).toBe("# Hello World");
    });

    it("renders headers at every level 1–6", () => {
      for (let level = 1; level <= 6; level++) {
        const header: HeaderNode = {
          kind: "Header",
          level,
          content: [`Level ${level}`],
        };
        expect(markdownRenderer.renderHeader(header)).toBe(
          "#".repeat(level) + ` Level ${level}`,
        );
      }
    });

    it("renders a header with inline formatting", () => {
      const header: HeaderNode = {
        kind: "Header",
        level: 2,
        content: ["This is ", { kind: "Strong", content: ["important"] }],
      };
      expect(markdownRenderer.renderHeader(header)).toBe(
        "## This is **important**",
      );
    });

    it("renders a header with an empty content line", () => {
      const header: HeaderNode = { kind: "Header", level: 3, content: [""] };
      expect(markdownRenderer.renderHeader(header)).toBe("### ");
    });
  });

  // ---------------------------------------------------------------------------
  // renderParagraph
  // ---------------------------------------------------------------------------

  describe("renderParagraph", () => {
    it("renders a single-line paragraph", () => {
      const para: ParagraphNode = {
        kind: "Paragraph",
        content: [["A simple paragraph."]],
      };
      expect(markdownRenderer.renderParagraph(para)).toBe(
        "A simple paragraph.",
      );
    });

    it("joins multiple lines with a single newline", () => {
      const para: ParagraphNode = {
        kind: "Paragraph",
        content: [["First line"], ["Second line"], ["Third line"]],
      };
      expect(markdownRenderer.renderParagraph(para)).toBe(
        "First line\nSecond line\nThird line",
      );
    });

    it("renders inline formatting within a paragraph", () => {
      const para: ParagraphNode = {
        kind: "Paragraph",
        content: [["Hello ", { kind: "Emphasis", content: ["world"] }, "."]],
      };
      expect(markdownRenderer.renderParagraph(para)).toBe("Hello *world*.");
    });

    it("renders an empty paragraph as an empty string", () => {
      const para: ParagraphNode = { kind: "Paragraph", content: [] };
      expect(markdownRenderer.renderParagraph(para)).toBe("");
    });
  });

  // ---------------------------------------------------------------------------
  // renderCodeBlock
  // ---------------------------------------------------------------------------

  describe("renderCodeBlock", () => {
    it("renders a code block without a language tag", () => {
      const block: CodeBlockNode = {
        kind: "CodeBlock",
        content: ["function test() {", "  return 42;", "}"],
      };
      expect(markdownRenderer.renderCodeBlock(block)).toBe(
        "```\nfunction test() {\n  return 42;\n}\n```",
      );
    });

    it("renders a code block with a language tag", () => {
      const block: CodeBlockNode = {
        kind: "CodeBlock",
        content: ["const x = 5;"],
        language: "typescript",
      };
      expect(markdownRenderer.renderCodeBlock(block)).toBe(
        "```typescript\nconst x = 5;\n```",
      );
    });

    it("renders a single-line code block", () => {
      const block: CodeBlockNode = {
        kind: "CodeBlock",
        content: ["echo 'hello'"],
        language: "bash",
      };
      expect(markdownRenderer.renderCodeBlock(block)).toBe(
        "```bash\necho 'hello'\n```",
      );
    });

    it("renders an empty code block without a language tag", () => {
      const block: CodeBlockNode = {
        kind: "CodeBlock",
        content: [],
      };
      expect(markdownRenderer.renderCodeBlock(block)).toBe("```\n\n```");
    });

    it("renders an empty code block with a language tag", () => {
      const block: CodeBlockNode = {
        kind: "CodeBlock",
        content: [],
        language: "python",
      };
      expect(markdownRenderer.renderCodeBlock(block)).toBe("```python\n\n```");
    });
  });

  // ---------------------------------------------------------------------------
  // renderListBlock
  // ---------------------------------------------------------------------------

  describe("renderListBlock", () => {
    it("renders a simple bulleted list with default marker '-'", () => {
      const list: BulletBlock = {
        kind: "BulletedList",
        content: [
          { kind: "BulletItem", content: [["Alpha"]] },
          { kind: "BulletItem", content: [["Beta"]] },
          { kind: "BulletItem", content: [["Gamma"]] },
        ],
      };
      expect(markdownRenderer.renderListBlock(list)).toBe(
        "- Alpha\n- Beta\n- Gamma",
      );
    });

    it("preserves the '*' marker stored in markerByLanguage", () => {
      const list: BulletBlock = {
        kind: "BulletedList",
        content: [
          {
            kind: "BulletItem",
            content: [["First"]],
            markerByLanguage: { markdown: "*" },
          },
          {
            kind: "BulletItem",
            content: [["Second"]],
            markerByLanguage: { markdown: "*" },
          },
        ],
      };
      expect(markdownRenderer.renderListBlock(list)).toBe("* First\n* Second");
    });

    it("falls back to '-' when markerByLanguage is absent", () => {
      const item: BulletItemNode = { kind: "BulletItem", content: [["Item"]] };
      const list: BulletBlock = { kind: "BulletedList", content: [item] };
      expect(markdownRenderer.renderListBlock(list)).toBe("- Item");
    });

    it("falls back to '-' when markerByLanguage has no markdown entry", () => {
      const item: BulletItemNode = {
        kind: "BulletItem",
        content: [["Item"]],
        markerByLanguage: { org: "+" },
      };
      const list: BulletBlock = { kind: "BulletedList", content: [item] };
      expect(markdownRenderer.renderListBlock(list)).toBe("- Item");
    });

    it("renders a simple numbered list", () => {
      const list: NumberedBlock = {
        kind: "NumberedList",
        content: [
          { kind: "NumberedItem", content: [["Step one"]] },
          { kind: "NumberedItem", content: [["Step two"]] },
          { kind: "NumberedItem", content: [["Step three"]] },
        ],
      };
      expect(markdownRenderer.renderListBlock(list)).toBe(
        "1. Step one\n2. Step two\n3. Step three",
      );
    });

    it("indents a nested bulleted list by 4 spaces", () => {
      const list: BulletBlock = {
        kind: "BulletedList",
        content: [
          { kind: "BulletItem", content: [["Parent"]] },
          {
            kind: "BulletedList",
            content: [
              { kind: "BulletItem", content: [["Child A"]] },
              { kind: "BulletItem", content: [["Child B"]] },
            ],
          },
        ],
      };
      expect(markdownRenderer.renderListBlock(list)).toBe(
        "- Parent\n    - Child A\n    - Child B",
      );
    });

    it("indents a nested numbered list inside a bulleted list by 4 spaces", () => {
      const list: BulletBlock = {
        kind: "BulletedList",
        content: [
          { kind: "BulletItem", content: [["Intro"]] },
          {
            kind: "NumberedList",
            content: [
              { kind: "NumberedItem", content: [["One"]] },
              { kind: "NumberedItem", content: [["Two"]] },
            ],
          },
        ],
      };
      expect(markdownRenderer.renderListBlock(list)).toBe(
        "- Intro\n    1. One\n    2. Two",
      );
    });

    it("renders a bullet item with inline formatting", () => {
      const list: BulletBlock = {
        kind: "BulletedList",
        content: [
          {
            kind: "BulletItem",
            content: [["This is ", { kind: "Strong", content: ["important"] }]],
          },
        ],
      };
      expect(markdownRenderer.renderListBlock(list)).toBe(
        "- This is **important**",
      );
    });
  });

  // ---------------------------------------------------------------------------
  // renderNode
  // ---------------------------------------------------------------------------

  describe("renderNode", () => {
    it("dispatches Header nodes", () => {
      const node: HeaderNode = {
        kind: "Header",
        level: 1,
        content: ["Title"],
      };
      expect(markdownRenderer.renderNode(node)).toBe("# Title");
    });

    it("dispatches Paragraph nodes", () => {
      const node: ParagraphNode = {
        kind: "Paragraph",
        content: [["Some text"]],
      };
      expect(markdownRenderer.renderNode(node)).toBe("Some text");
    });

    it("dispatches BulletedList nodes", () => {
      const node: BulletBlock = {
        kind: "BulletedList",
        content: [
          { kind: "BulletItem", content: [["A"]] },
          { kind: "BulletItem", content: [["B"]] },
        ],
      };
      expect(markdownRenderer.renderNode(node)).toBe("- A\n- B");
    });

    it("dispatches NumberedList nodes", () => {
      const node: NumberedBlock = {
        kind: "NumberedList",
        content: [
          { kind: "NumberedItem", content: [["First"]] },
          { kind: "NumberedItem", content: [["Second"]] },
        ],
      };
      expect(markdownRenderer.renderNode(node)).toBe("1. First\n2. Second");
    });

    it("dispatches CodeBlock nodes", () => {
      const node: CodeBlockNode = {
        kind: "CodeBlock",
        content: ["x = 1"],
        language: "python",
      };
      expect(markdownRenderer.renderNode(node)).toBe("```python\nx = 1\n```");
    });
  });

  // ---------------------------------------------------------------------------
  // renderDocument
  // ---------------------------------------------------------------------------

  describe("renderDocument", () => {
    it("renders an empty document as an empty string", () => {
      const doc: IRDocument = { kind: "Document", nodes: [] };
      expect(markdownRenderer.renderDocument(doc)).toBe("");
    });

    it("renders a single-node document without trailing blank lines", () => {
      const doc: IRDocument = {
        kind: "Document",
        nodes: [{ kind: "Header", level: 1, content: ["Hello"] }],
      };
      expect(markdownRenderer.renderDocument(doc)).toBe("# Hello");
    });

    it("separates top-level nodes with a blank line", () => {
      const doc: IRDocument = {
        kind: "Document",
        nodes: [
          { kind: "Header", level: 1, content: ["Title"] },
          { kind: "Paragraph", content: [["A paragraph."]] },
        ],
      };
      expect(markdownRenderer.renderDocument(doc)).toBe(
        "# Title\n\nA paragraph.",
      );
    });

    it("renders a full document with header, paragraph, list, and code block", () => {
      const doc: IRDocument = {
        kind: "Document",
        nodes: [
          { kind: "Header", level: 1, content: ["My Post"] },
          { kind: "Paragraph", content: [["Introduction text."]] },
          {
            kind: "BulletedList",
            content: [
              { kind: "BulletItem", content: [["Point A"]] },
              { kind: "BulletItem", content: [["Point B"]] },
            ],
          },
          {
            kind: "CodeBlock",
            content: ["console.log('hello');"],
            language: "javascript",
          },
        ],
      };
      expect(markdownRenderer.renderDocument(doc)).toBe(
        "# My Post\n\nIntroduction text.\n\n- Point A\n- Point B\n\n```javascript\nconsole.log('hello');\n```",
      );
    });

    it("separates two paragraphs with a blank line", () => {
      const doc: IRDocument = {
        kind: "Document",
        nodes: [
          { kind: "Paragraph", content: [["First paragraph."]] },
          { kind: "Paragraph", content: [["Second paragraph."]] },
        ],
      };
      expect(markdownRenderer.renderDocument(doc)).toBe(
        "First paragraph.\n\nSecond paragraph.",
      );
    });
  });
});
