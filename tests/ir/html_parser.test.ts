import { describe, it, expect } from "vitest";
import { parseHtmlToIR } from "../../src/ir/html_parser";
import type {
  BulletBlock,
  CodeBlockNode,
  HeaderNode,
  NumberedBlock,
  ParagraphNode,
} from "../../src/ir/types";

describe("parseHtmlToIR", () => {
  describe("Headers", () => {
    it("parses h1-h3 as header nodes with matching levels", () => {
      const html = "<h1>Main</h1><h2>Section</h2><h3>Subsection</h3>";
      const result = parseHtmlToIR(html);

      expect(result.isOk()).toBe(true);
      if (result.isErr()) {
        throw result.error;
      }
      const nodes = result.value;

      expect(nodes).toHaveLength(3);

      const h1 = nodes[0] as HeaderNode;
      const h2 = nodes[1] as HeaderNode;
      const h3 = nodes[2] as HeaderNode;

      expect(h1).toEqual({ kind: "Header", level: 1, content: ["Main"] });
      expect(h2).toEqual({ kind: "Header", level: 2, content: ["Section"] });
      expect(h3).toEqual({
        kind: "Header",
        level: 3,
        content: ["Subsection"],
      });
    });
  });

  describe("Paragraphs and Inline Spans", () => {
    it("parses paragraph text and inline formatting spans", () => {
      const html =
        '<p>Hello <em>world</em>, this is <strong>bold</strong>, <code>x()</code>, <img src="https://example.com/cat.png" alt="Cat">, and <a href="https://example.com">a link</a>.</p>';
      const result = parseHtmlToIR(html);

      expect(result.isOk()).toBe(true);
      if (result.isErr()) {
        throw result.error;
      }
      const nodes = result.value;

      expect(nodes).toHaveLength(1);
      const paragraph = nodes[0] as ParagraphNode;

      expect(paragraph.kind).toBe("Paragraph");
      expect(paragraph.content).toEqual([
        [
          "Hello ",
          { kind: "Emphasis", content: ["world"] },
          ", this is ",
          { kind: "Strong", content: ["bold"] },
          ", ",
          { kind: "Code", code: "x()" },
          ", ",
          { kind: "InlineImage", href: "https://example.com/cat.png", alt: "Cat" },
          ", and ",
          {
            kind: "Link",
            href: "https://example.com",
            content: ["a link"],
          },
          ".",
        ],
      ]);
    });

    it("parses separate paragraph elements as separate paragraph nodes", () => {
      const html = "<p>First paragraph.</p><p>Second paragraph.</p>";
      const result = parseHtmlToIR(html);

      expect(result.isOk()).toBe(true);
      if (result.isErr()) {
        throw result.error;
      }
      const nodes = result.value;

      expect(nodes).toHaveLength(2);
      expect(nodes[0]).toEqual({
        kind: "Paragraph",
        content: [["First paragraph."]],
      });
      expect(nodes[1]).toEqual({
        kind: "Paragraph",
        content: [["Second paragraph."]],
      });
    });

    it("parses nested inline formatting spans", () => {
      const html = "<p><strong>very <em>important</em></strong></p>";
      const result = parseHtmlToIR(html);

      expect(result.isOk()).toBe(true);
      if (result.isErr()) {
        throw result.error;
      }
      const nodes = result.value;

      expect(nodes).toHaveLength(1);
      const paragraph = nodes[0] as ParagraphNode;
      expect(paragraph.kind).toBe("Paragraph");
      expect(paragraph.content).toEqual([
        [
          {
            kind: "Strong",
            content: ["very ", { kind: "Emphasis", content: ["important"] }],
          },
        ],
      ]);
    });

    it("parses standalone image elements", () => {
      const html = '<img src="/images/logo.png" alt="Logo">';
      const result = parseHtmlToIR(html);

      expect(result.isOk()).toBe(true);
      if (result.isErr()) {
        throw result.error;
      }

      expect(result.value).toEqual([
        { kind: "Image", href: "/images/logo.png", alt: "Logo" },
      ]);
    });
  });

  describe("Lists", () => {
    it("parses unordered lists into BulletedList nodes", () => {
      const html = "<ul><li>Alpha</li><li>Beta</li><li>Gamma</li></ul>";
      const result = parseHtmlToIR(html);

      expect(result.isOk()).toBe(true);
      if (result.isErr()) {
        throw result.error;
      }
      const nodes = result.value;

      expect(nodes).toHaveLength(1);
      const list = nodes[0] as BulletBlock;
      expect(list.kind).toBe("BulletedList");
      expect(list.content).toEqual([
        { kind: "BulletItem", content: [["Alpha"]] },
        { kind: "BulletItem", content: [["Beta"]] },
        { kind: "BulletItem", content: [["Gamma"]] },
      ]);
    });

    it("parses ordered lists into NumberedList nodes", () => {
      const html = "<ol><li>One</li><li>Two</li></ol>";
      const result = parseHtmlToIR(html);

      expect(result.isOk()).toBe(true);
      if (result.isErr()) {
        throw result.error;
      }
      const nodes = result.value;

      expect(nodes).toHaveLength(1);
      const list = nodes[0] as NumberedBlock;
      expect(list.kind).toBe("NumberedList");
      expect(list.content).toEqual([
        { kind: "NumberedItem", content: [["One"]] },
        { kind: "NumberedItem", content: [["Two"]] },
      ]);
    });

    it("parses nested list blocks as nested IR list content", () => {
      const html = "<ul><li>Parent<ol><li>Child 1</li><li>Child 2</li></ol></li></ul>";
      const result = parseHtmlToIR(html);

      expect(result.isOk()).toBe(true);
      if (result.isErr()) {
        throw result.error;
      }
      const nodes = result.value;

      expect(nodes).toHaveLength(1);
      const list = nodes[0] as BulletBlock;
      expect(list.kind).toBe("BulletedList");
      expect(list.content).toEqual([
        { kind: "BulletItem", content: [["Parent"]] },
        {
          kind: "NumberedList",
          content: [
            { kind: "NumberedItem", content: [["Child 1"]] },
            { kind: "NumberedItem", content: [["Child 2"]] },
          ],
        },
      ]);
    });

    it("parses multi-level mixed nested lists", () => {
      const html =
        "<ol><li>Top 1<ul><li>Mid A<ol><li>Leaf i</li></ol></li></ul></li><li>Top 2</li></ol>";
      const result = parseHtmlToIR(html);

      expect(result.isOk()).toBe(true);
      if (result.isErr()) {
        throw result.error;
      }
      const nodes = result.value;

      expect(nodes).toHaveLength(1);
      const list = nodes[0] as NumberedBlock;
      expect(list.kind).toBe("NumberedList");
      expect(list.content).toEqual([
        { kind: "NumberedItem", content: [["Top 1"]] },
        {
          kind: "BulletedList",
          content: [
            { kind: "BulletItem", content: [["Mid A"]] },
            {
              kind: "NumberedList",
              content: [{ kind: "NumberedItem", content: [["Leaf i"]] }],
            },
          ],
        },
        { kind: "NumberedItem", content: [["Top 2"]] },
      ]);
    });
  });

  describe("Code Blocks", () => {
    it("parses pre/code blocks and keeps line boundaries", () => {
      const html = "<pre><code>const a = 1;\nconst b = 2;</code></pre>";
      const result = parseHtmlToIR(html);

      expect(result.isOk()).toBe(true);
      if (result.isErr()) {
        throw result.error;
      }
      const nodes = result.value;

      expect(nodes).toHaveLength(1);
      const code = nodes[0] as CodeBlockNode;
      expect(code).toEqual({
        kind: "CodeBlock",
        content: ["const a = 1;", "const b = 2;"],
      });
    });

    it("parses code language from class attributes", () => {
      const html =
        '<pre><code class="language-typescript">const x: number = 1;</code></pre>';
      const result = parseHtmlToIR(html);

      expect(result.isOk()).toBe(true);
      if (result.isErr()) {
        throw result.error;
      }
      const nodes = result.value;

      expect(nodes).toHaveLength(1);
      const code = nodes[0] as CodeBlockNode;
      expect(code.kind).toBe("CodeBlock");
      expect(code.content).toEqual(["const x: number = 1;"]);
      expect(code.language).toBe("typescript");
    });
  });

  describe("Mixed Documents", () => {
    it("preserves block order in mixed-content documents", () => {
      const html = `
        <h1>Title</h1>
        <p>Intro text.</p>
        <ul><li>Point A</li><li>Point B</li></ul>
        <pre><code>echo test</code></pre>
      `;
      const result = parseHtmlToIR(html);

      expect(result.isOk()).toBe(true);
      if (result.isErr()) {
        throw result.error;
      }
      const nodes = result.value;

      expect(nodes).toHaveLength(4);
      expect(nodes[0].kind).toBe("Header");
      expect(nodes[1].kind).toBe("Paragraph");
      expect(nodes[2].kind).toBe("BulletedList");
      expect(nodes[3].kind).toBe("CodeBlock");
    });

    it("ignores inter-element whitespace-only text nodes", () => {
      const html = "\n\n  <h2>Only Header</h2>\n\n";
      const result = parseHtmlToIR(html);

      expect(result.isOk()).toBe(true);
      if (result.isErr()) {
        throw result.error;
      }
      const nodes = result.value;

      expect(nodes).toHaveLength(1);
      expect(nodes[0]).toEqual({
        kind: "Header",
        level: 2,
        content: ["Only Header"],
      });
    });
  });

  describe("Errors", () => {
    it("returns an Err for malformed html input", () => {
      const malformed = "<h1>Unclosed heading";
      const result = parseHtmlToIR(malformed);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(Error);
        expect(result.error.message).toBe("Could not parse html");
      }
    });

    it("returns an Err for misordered list closing tags", () => {
      const malformed = "<ul><li>Alpha</li></ol>";
      const result = parseHtmlToIR(malformed);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(Error);
        expect(result.error.message).toBe("Could not parse html");
      }
    });

    it("returns an Err for crossing nested list boundaries", () => {
      const malformed = "<ul><li>Parent<ol><li>Child</li></li></ul></ol>";
      const result = parseHtmlToIR(malformed);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(Error);
        expect(result.error.message).toBe("Could not parse html");
      }
    });

    it("returns an Err for list item outside a list container", () => {
      const malformed = "<li>Orphan item</li>";
      const result = parseHtmlToIR(malformed);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(Error);
        expect(result.error.message).toBe("Could not parse html");
      }
    });

    it("returns an Err for misordered inline closing tags", () => {
      const malformed = "<p><strong>bold <em>text</strong></em></p>";
      const result = parseHtmlToIR(malformed);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(Error);
        expect(result.error.message).toBe("Could not parse html");
      }
    });
  });
});