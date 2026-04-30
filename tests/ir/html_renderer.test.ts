import { describe, it, expect } from "vitest";
import { htmlRenderer } from "../../src/ir/html_renderer";
import type {
  HeaderNode,
  CodeBlockNode,
  ParagraphNode,
  BulletBlock,
  NumberedBlock,
  IRDocument,
} from "../../src/ir/types";

describe("htmlRenderer", () => {
  describe("renderHeader", () => {
    it("renders a simple h1 header", () => {
      const header: HeaderNode = {
        kind: "Header",
        level: 1,
        content: ["Hello World"],
      };
      expect(htmlRenderer.renderHeader(header)).toBe("<h1>Hello World</h1>");
    });

    it("renders headers at different levels", () => {
      const h3: HeaderNode = {
        kind: "Header",
        level: 3,
        content: ["Level 3 Header"],
      };
      expect(htmlRenderer.renderHeader(h3)).toBe("<h3>Level 3 Header</h3>");
    });

    it("renders headers with emphasis", () => {
      const header: HeaderNode = {
        kind: "Header",
        level: 2,
        content: ["This is ", { kind: "Emphasis", content: ["important"] }],
      };
      expect(htmlRenderer.renderHeader(header)).toBe(
        "<h2>This is <em>important</em></h2>",
      );
    });

    it("handles invalid header levels (too low)", () => {
      const header: HeaderNode = {
        kind: "Header",
        level: 0,
        content: ["Invalid"],
      };
      const result = htmlRenderer.renderHeader(header);
      expect(result).toContain("header level is outside range");
    });

    it("handles invalid header levels (too high)", () => {
      const header: HeaderNode = {
        kind: "Header",
        level: 7,
        content: ["Invalid"],
      };
      const result = htmlRenderer.renderHeader(header);
      expect(result).toContain("header level is outside range");
    });
  });

  describe("renderSpan", () => {
    it("renders plain text", () => {
      expect(htmlRenderer.renderSpan("Hello")).toBe("Hello");
    });

    it("renders emphasis span", () => {
      expect(
        htmlRenderer.renderSpan({ kind: "Emphasis", content: ["italic"] }),
      ).toBe("<em>italic</em>");
    });

    it("renders strong span", () => {
      expect(
        htmlRenderer.renderSpan({ kind: "Strong", content: ["bold"] }),
      ).toBe("<strong>bold</strong>");
    });

    it("renders code span", () => {
      expect(
        htmlRenderer.renderSpan({ kind: "Code", code: "const x = 5" }),
      ).toBe("<code>const x = 5</code>");
    });

    it("renders link span", () => {
      expect(
        htmlRenderer.renderSpan({
          kind: "Link",
          href: "https://example.com",
          content: ["Click here"],
        }),
      ).toBe('<a href="https://example.com">Click here</a>');
    });

    it("renders image span", () => {
      expect(
        htmlRenderer.renderSpan({
          kind: "InlineImage",
          href: "https://example.com/cat.png",
          alt: "Cat",
        }),
      ).toBe('<img src="https://example.com/cat.png" alt="Cat">');
    });

    it("renders nested emphasis within strong", () => {
      const span = {
        kind: "Strong" as const,
        content: [
          "really ",
          { kind: "Emphasis" as const, content: ["very"] },
          " important",
        ],
      };
      expect(htmlRenderer.renderSpan(span)).toBe(
        "<strong>really <em>very</em> important</strong>",
      );
    });

    it("renders link with emphasized content", () => {
      const link = {
        kind: "Link" as const,
        href: "https://test.com",
        content: [{ kind: "Emphasis" as const, content: ["styled"] }, " link"],
      };
      expect(htmlRenderer.renderSpan(link)).toBe(
        '<a href="https://test.com"><em>styled</em> link</a>',
      );
    });
  });

  describe("renderLine", () => {
    it("renders a line with plain text", () => {
      expect(htmlRenderer.renderLine(["Simple text"])).toBe("Simple text");
    });

    it("renders a line with multiple spans", () => {
      const line = [
        "This is ",
        { kind: "Strong" as const, content: ["bold"] },
        " and ",
        { kind: "Emphasis" as const, content: ["italic"] },
      ];
      expect(htmlRenderer.renderLine(line)).toBe(
        "This is <strong>bold</strong> and <em>italic</em>",
      );
    });

    it("renders an empty line", () => {
      expect(htmlRenderer.renderLine([])).toBe("");
    });
  });

  describe("renderParagraph", () => {
    it("renders a single-line paragraph", () => {
      const paragraph: ParagraphNode = {
        kind: "Paragraph",
        content: [["This is a paragraph."]],
      };
      expect(htmlRenderer.renderParagraph(paragraph)).toBe(
        "<p>This is a paragraph.</p>",
      );
    });

    it("renders a multi-line paragraph with line breaks", () => {
      const paragraph: ParagraphNode = {
        kind: "Paragraph",
        content: [["First line"], ["Second line"], ["Third line"]],
      };
      expect(htmlRenderer.renderParagraph(paragraph)).toBe(
        "<p>First line<br>Second line<br>Third line</p>",
      );
    });

    it("renders paragraph with inline formatting", () => {
      const paragraph: ParagraphNode = {
        kind: "Paragraph",
        content: [
          [
            "This has ",
            { kind: "Strong", content: ["bold"] },
            " and ",
            { kind: "Code", code: "code" },
            " text.",
          ],
        ],
      };
      expect(htmlRenderer.renderParagraph(paragraph)).toBe(
        "<p>This has <strong>bold</strong> and <code>code</code> text.</p>",
      );
    });
  });

  describe("renderCodeBlock", () => {
    it("renders code block without language", () => {
      const codeBlock: CodeBlockNode = {
        kind: "CodeBlock",
        content: ["function test() {", "  return 42;", "}"],
      };
      expect(htmlRenderer.renderCodeBlock(codeBlock)).toBe(
        "<pre><code>function test() {\n  return 42;\n}</code></pre>",
      );
    });

    it("renders code block with language class", () => {
      const codeBlock: CodeBlockNode = {
        kind: "CodeBlock",
        content: ["const x = 5;"],
        language: "javascript",
      };
      expect(htmlRenderer.renderCodeBlock(codeBlock)).toBe(
        '<pre><code class="javascript">const x = 5;</code></pre>',
      );
    });

    it("renders single-line code block", () => {
      const codeBlock: CodeBlockNode = {
        kind: "CodeBlock",
        content: ["echo 'hello'"],
        language: "bash",
      };
      expect(htmlRenderer.renderCodeBlock(codeBlock)).toBe(
        "<pre><code class=\"bash\">echo 'hello'</code></pre>",
      );
    });

    it("renders empty code block", () => {
      const codeBlock: CodeBlockNode = {
        kind: "CodeBlock",
        content: [],
      };
      expect(htmlRenderer.renderCodeBlock(codeBlock)).toBe(
        "<pre><code></code></pre>",
      );
    });
  });

  describe("renderListBlock", () => {
    it("renders a simple bulleted list", () => {
      const list: BulletBlock = {
        kind: "BulletedList",
        content: [
          { kind: "BulletItem", content: [["First item"]] },
          { kind: "BulletItem", content: [["Second item"]] },
          { kind: "BulletItem", content: [["Third item"]] },
        ],
      };
      expect(htmlRenderer.renderListBlock(list)).toBe(
        "<ul><li>First item</li><li>Second item</li><li>Third item</li></ul>",
      );
    });

    it("renders a simple numbered list", () => {
      const list: NumberedBlock = {
        kind: "NumberedList",
        content: [
          { kind: "NumberedItem", content: [["Step one"]] },
          { kind: "NumberedItem", content: [["Step two"]] },
        ],
      };
      expect(htmlRenderer.renderListBlock(list)).toBe(
        "<ol><li>Step one</li><li>Step two</li></ol>",
      );
    });

    it("renders bullet items with multi-line content", () => {
      const list: BulletBlock = {
        kind: "BulletedList",
        content: [
          {
            kind: "BulletItem",
            content: [["Line one"], ["Line two"]],
          },
        ],
      };
      expect(htmlRenderer.renderListBlock(list)).toBe(
        "<ul><li>Line one<br>Line two</li></ul>",
      );
    });

    it("renders list items with inline formatting", () => {
      const list: BulletBlock = {
        kind: "BulletedList",
        content: [
          {
            kind: "BulletItem",
            content: [
              ["This is ", { kind: "Strong", content: ["very"] }, " important"],
            ],
          },
        ],
      };
      expect(htmlRenderer.renderListBlock(list)).toBe(
        "<ul><li>This is <strong>very</strong> important</li></ul>",
      );
    });

    it("renders nested bullet lists", () => {
      const list: BulletBlock = {
        kind: "BulletedList",
        content: [
          { kind: "BulletItem", content: [["Parent item"]] },
          {
            kind: "BulletedList",
            content: [
              { kind: "BulletItem", content: [["Nested item 1"]] },
              { kind: "BulletItem", content: [["Nested item 2"]] },
            ],
          },
        ],
      };
      expect(htmlRenderer.renderListBlock(list)).toBe(
        "<ul><li>Parent item<ul><li>Nested item 1</li><li>Nested item 2</li></ul></li></ul>",
      );
    });

    it("renders nested numbered list within bullet list", () => {
      const list: BulletBlock = {
        kind: "BulletedList",
        content: [
          { kind: "BulletItem", content: [["Main point"]] },
          {
            kind: "NumberedList",
            content: [
              { kind: "NumberedItem", content: [["Sub-step 1"]] },
              { kind: "NumberedItem", content: [["Sub-step 2"]] },
            ],
          },
        ],
      };
      expect(htmlRenderer.renderListBlock(list)).toBe(
        "<ul><li>Main point<ol><li>Sub-step 1</li><li>Sub-step 2</li></ol></li></ul>",
      );
    });

    it("renders deeply nested lists", () => {
      const list: BulletBlock = {
        kind: "BulletedList",
        content: [
          { kind: "BulletItem", content: [["Level 1"]] },
          {
            kind: "BulletedList",
            content: [
              { kind: "BulletItem", content: [["Level 2"]] },
              {
                kind: "BulletedList",
                content: [{ kind: "BulletItem", content: [["Level 3"]] }],
              },
            ],
          },
        ],
      };
      expect(htmlRenderer.renderListBlock(list)).toBe(
        "<ul><li>Level 1<ul><li>Level 2<ul><li>Level 3</li></ul></li></ul></li></ul>",
      );
    });
  });

  describe("renderNode", () => {
    it("dispatches to correct renderer for header", () => {
      const node: HeaderNode = {
        kind: "Header",
        level: 1,
        content: ["Title"],
      };
      expect(htmlRenderer.renderNode(node)).toBe("<h1>Title</h1>");
    });

    it("dispatches to correct renderer for paragraph", () => {
      const node: ParagraphNode = {
        kind: "Paragraph",
        content: [["Text"]],
      };
      expect(htmlRenderer.renderNode(node)).toBe("<p>Text</p>");
    });

    it("dispatches to correct renderer for code block", () => {
      const node: CodeBlockNode = {
        kind: "CodeBlock",
        content: ["code"],
      };
      expect(htmlRenderer.renderNode(node)).toBe(
        "<pre><code>code</code></pre>",
      );
    });

    it("dispatches to correct renderer for bullet list", () => {
      const node: BulletBlock = {
        kind: "BulletedList",
        content: [{ kind: "BulletItem", content: [["Item"]] }],
      };
      expect(htmlRenderer.renderNode(node)).toBe("<ul><li>Item</li></ul>");
    });

    it("dispatches to correct renderer for numbered list", () => {
      const node: NumberedBlock = {
        kind: "NumberedList",
        content: [{ kind: "NumberedItem", content: [["Item"]] }],
      };
      expect(htmlRenderer.renderNode(node)).toBe("<ol><li>Item</li></ol>");
    });
  });

  describe("renderDocument", () => {
    it("renders an empty document", () => {
      const doc: IRDocument = {
        kind: "Document",
        nodes: [],
      };
      expect(htmlRenderer.renderDocument(doc)).toBe("");
    });

    it("renders a document with a single header", () => {
      const doc: IRDocument = {
        kind: "Document",
        nodes: [
          {
            kind: "Header",
            level: 1,
            content: ["My Document"],
          },
        ],
      };
      expect(htmlRenderer.renderDocument(doc)).toBe("<h1>My Document</h1>");
    });

    it("renders a document with multiple node types", () => {
      const doc: IRDocument = {
        kind: "Document",
        nodes: [
          {
            kind: "Header",
            level: 1,
            content: ["Introduction"],
          },
          {
            kind: "Paragraph",
            content: [["This is the first paragraph."]],
          },
          {
            kind: "Header",
            level: 2,
            content: ["Code Example"],
          },
          {
            kind: "CodeBlock",
            content: ["console.log('Hello')"],
            language: "javascript",
          },
        ],
      };
      const expected =
        "<h1>Introduction</h1>" +
        "<p>This is the first paragraph.</p>" +
        "<h2>Code Example</h2>" +
        "<pre><code class=\"javascript\">console.log('Hello')</code></pre>";
      expect(htmlRenderer.renderDocument(doc)).toBe(expected);
    });

    it("renders a complex document with all node types", () => {
      const doc: IRDocument = {
        kind: "Document",
        nodes: [
          {
            kind: "Header",
            level: 1,
            content: ["Complete Guide"],
          },
          {
            kind: "Paragraph",
            content: [
              [
                "This guide covers ",
                { kind: "Strong", content: ["everything"] },
                ".",
              ],
            ],
          },
          {
            kind: "BulletedList",
            content: [
              { kind: "BulletItem", content: [["Feature A"]] },
              { kind: "BulletItem", content: [["Feature B"]] },
            ],
          },
          {
            kind: "NumberedList",
            content: [
              { kind: "NumberedItem", content: [["First step"]] },
              { kind: "NumberedItem", content: [["Second step"]] },
            ],
          },
          {
            kind: "CodeBlock",
            content: ["npm install"],
            language: "bash",
          },
        ],
      };
      const expected =
        "<h1>Complete Guide</h1>" +
        "<p>This guide covers <strong>everything</strong>.</p>" +
        "<ul><li>Feature A</li><li>Feature B</li></ul>" +
        "<ol><li>First step</li><li>Second step</li></ol>" +
        '<pre><code class="bash">npm install</code></pre>';
      expect(htmlRenderer.renderDocument(doc)).toBe(expected);
    });
  });
}); // htmlRenderer
