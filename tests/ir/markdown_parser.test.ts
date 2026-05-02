import { markdownRenderer } from "../../src/ir/markdown_renderer"

describe("End-to-end: save/load/resave cycle", () => {
  it("should preserve mixed markers through a full save/load/resave cycle", () => {
    const originalMarkdown = `# My List

- First item
* Second item
- Third item`;

    // Step 1: Parse original markdown
    const parseResult = parseMarkdownToIR(originalMarkdown);
    expect(parseResult.isOk()).toBe(true);
    if (!parseResult.isOk()) return;

    const ir = parseResult.value;

    // Step 2: Simulate saving to DB (JSON stringify)
    const jsonStr = JSON.stringify(ir);
    const irFromJson = JSON.parse(jsonStr);

    // Step 3: Reconstruct markdown from IR
    const reconstructed = markdownRenderer.renderDocument({ kind: 'Document', nodes: irFromJson });

    // Step 4: Parse the reconstructed markdown again
    const reparsedResult = parseMarkdownToIR(reconstructed);
    expect(reparsedResult.isOk()).toBe(true);
    if (!reparsedResult.isOk()) return;

    const reparsedIr = reparsedResult.value;

    // Step 5: Verify markers are preserved through the cycle
    const bulletBlock = reparsedIr[1] as any; // Index 1 should be the bullet list (after header)
    expect(bulletBlock.kind).toBe("BulletedList");
    expect(bulletBlock.content).toHaveLength(3);

    expect(bulletBlock.content[0].markerByLanguage).toEqual({ markdown: "-" });
    expect(bulletBlock.content[1].markerByLanguage).toEqual({ markdown: "*" });
    expect(bulletBlock.content[2].markerByLanguage).toEqual({ markdown: "-" });
  });
});
import { describe, it, expect } from "vitest";
import { parseMarkdownToIR } from "../../src/ir/markdown_parser";
import type {
  HeaderNode,
  ParagraphNode,
  BulletBlock,
  NumberedBlock,
  CodeBlockNode,
} from "../../src/ir/types";

describe("parseMarkdownToIR", () => {
  describe("Headers", () => {
    it("should parse a level 1 header", () => {
      const markdown = "# Hello World";
      const result = parseMarkdownToIR(markdown);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(1);
        const header = result.value[0] as HeaderNode;
        expect(header.kind).toBe("Header");
        expect(header.level).toBe(1);
        expect(header.content).toEqual(["Hello World"]);
      }
    });

    it("should parse headers of all levels (1-6)", () => {
      const markdown = `# Level 1
## Level 2
### Level 3
#### Level 4
##### Level 5
###### Level 6`;

      const result = parseMarkdownToIR(markdown);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(6);

        for (let i = 0; i < 6; i++) {
          const header = result.value[i] as HeaderNode;
          expect(header.kind).toBe("Header");
          expect(header.level).toBe(i + 1);
          expect(header.content).toEqual([`Level ${i + 1}`]);
        }
      }
    });

    it("should handle headers with extra whitespace", () => {
      const markdown = "###   Lots of spaces   ";
      const result = parseMarkdownToIR(markdown);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const header = result.value[0] as HeaderNode;
        expect(header.kind).toBe("Header");
        expect(header.level).toBe(3);
        expect(header.content).toEqual(["Lots of spaces   "]);
      }
    });

    it("should handle empty header content", () => {
      const markdown = "##";
      const result = parseMarkdownToIR(markdown);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const header = result.value[0] as HeaderNode;
        expect(header.kind).toBe("Header");
        expect(header.level).toBe(2);
        expect(header.content).toEqual([""]);
      }
    });
  });

  describe("Paragraphs", () => {
    it("should parse a single line paragraph", () => {
      const markdown = "This is a simple paragraph.";
      const result = parseMarkdownToIR(markdown);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(1);
        const paragraph = result.value[0] as ParagraphNode;
        expect(paragraph.kind).toBe("Paragraph");
        expect(paragraph.content).toEqual([["This is a simple paragraph."]]);
      }
    });

    it("should parse multi-line paragraphs", () => {
      const markdown = `This is line one.
This is line two.
This is line three.`;

      const result = parseMarkdownToIR(markdown);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(1);
        const paragraph = result.value[0] as ParagraphNode;
        expect(paragraph.kind).toBe("Paragraph");
        expect(paragraph.content).toHaveLength(3);
        expect(paragraph.content).toEqual([
          ["This is line one."],
          ["This is line two."],
          ["This is line three."],
        ]);
      }
    });

    it("should parse inline image hyperlinks inside a paragraph", () => {
      const markdown = "Look at ![[./images/cat.png]] please.";
      const result = parseMarkdownToIR(markdown);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const paragraph = result.value[0] as ParagraphNode;
        expect(paragraph.kind).toBe("Paragraph");
        expect(paragraph.content).toEqual([
          ["Look at ", { kind: "InlineImage", href: "./images/cat.png" }, " please."],
        ]);
      }
    });

    it("should parse bold, italic, code, and links inside a paragraph", () => {
      const markdown = "This is **bold**, *italic*, `code`, and [a link](https://example.com).";
      const result = parseMarkdownToIR(markdown);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const paragraph = result.value[0] as ParagraphNode;
        expect(paragraph.kind).toBe("Paragraph");
        expect(paragraph.content).toEqual([
          [
            "This is ",
            { kind: "Strong", content: ["bold"] },
            ", ",
            { kind: "Emphasis", content: ["italic"] },
            ", ",
            { kind: "Code", code: "code" },
            ", and ",
            {
              kind: "Link",
              href: "https://example.com",
              content: ["a link"],
            },
            ".",
          ],
        ]);
      }
    });

    it("should separate paragraphs by blank lines", () => {
      const markdown = `First paragraph.

Second paragraph.`;

      const result = parseMarkdownToIR(markdown);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(2);

        const para1 = result.value[0] as ParagraphNode;
        expect(para1.kind).toBe("Paragraph");
        expect(para1.content).toEqual([["First paragraph."]]);

        const para2 = result.value[1] as ParagraphNode;
        expect(para2.kind).toBe("Paragraph");
        expect(para2.content).toEqual([["Second paragraph."]]);
      }
    });
  });

  describe("Bulleted Lists", () => {
    it("should parse a simple bulleted list with dash markers", () => {
      const markdown = `- Item 1
- Item 2
- Item 3`;

      const result = parseMarkdownToIR(markdown);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(1);
        const bulletBlock = result.value[0] as BulletBlock;

        bulletBlock.content.forEach((item, index) => {
          if (item.kind === "BulletItem") {
            expect(item.content).toEqual([[`Item ${index + 1}`]]);
            expect(item.markerByLanguage).toEqual({ markdown: "-" });
          }
        });
      }
    });

    it("should parse a bulleted list with asterisk markers", () => {
      const markdown = `* First item
* Second item`;

      const result = parseMarkdownToIR(markdown);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(1);
        const bulletBlock = result.value[0] as BulletBlock;
        expect(bulletBlock.kind).toBe("BulletedList");
        expect(bulletBlock.content).toHaveLength(2);

        const item1 = bulletBlock.content[0];
        if (item1.kind === "BulletItem") {
          expect(item1.content).toEqual([["First item"]]);
          expect(item1.markerByLanguage).toEqual({ markdown: "*" });
        }

        const item2 = bulletBlock.content[1];
        if (item2.kind === "BulletItem") {
          expect(item2.content).toEqual([["Second item"]]);
          expect(item2.markerByLanguage).toEqual({ markdown: "*" });
        }
      }
    });

    it("should parse a bulleted list with mixed markers (* and -)", () => {
      const markdown = `- First item
* Second item
- Third item`;

      const result = parseMarkdownToIR(markdown);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(1);
        const bulletBlock = result.value[0] as BulletBlock;
        expect(bulletBlock.kind).toBe("BulletedList");
        expect(bulletBlock.content).toHaveLength(3);

        const item1 = bulletBlock.content[0];
        if (item1.kind === "BulletItem") {
          expect(item1.content).toEqual([["First item"]]);
          expect(item1.markerByLanguage).toEqual({ markdown: "-" });
        }

        const item2 = bulletBlock.content[1];
        if (item2.kind === "BulletItem") {
          expect(item2.content).toEqual([["Second item"]]);
          expect(item2.markerByLanguage).toEqual({ markdown: "*" });
        }

        const item3 = bulletBlock.content[2];
        if (item3.kind === "BulletItem") {
          expect(item3.content).toEqual([["Third item"]]);
          expect(item3.markerByLanguage).toEqual({ markdown: "-" });
        }
      }
    });

    it("should parse bulleted list with indentation", () => {
      const markdown = `  - Indented item 1
  - Indented item 2`;

      const result = parseMarkdownToIR(markdown);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(1);
        const bulletBlock = result.value[0] as BulletBlock;
        expect(bulletBlock.kind).toBe("BulletedList");
        expect(bulletBlock.content).toHaveLength(2);

        const item1 = bulletBlock.content[0];
        if (item1.kind === "BulletItem") {
          expect(item1.content).toEqual([["Indented item 1"]]);
        }

        const item2 = bulletBlock.content[1];
        if (item2.kind === "BulletItem") {
          expect(item2.content).toEqual([["Indented item 2"]]);
        }
      }
    });
  });

  describe("Numbered Lists", () => {
    it("should parse a simple numbered list", () => {
      const markdown = `1. First item
2. Second item
3. Third item`;

      const result = parseMarkdownToIR(markdown);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(1);
        const numberedBlock = result.value[0] as NumberedBlock;
        expect(numberedBlock.kind).toBe("NumberedList");
        expect(numberedBlock.content).toHaveLength(3);

        numberedBlock.content.forEach((item, index) => {
          if (item.kind === "NumberedItem") {
            expect(item.content).toEqual([
              [`${["First", "Second", "Third"][index]} item`],
            ]);
          }
        });
      }
    });

    it("should parse numbered list with different starting numbers", () => {
      const markdown = `5. Fifth item
10. Tenth item
100. Hundredth item`;

      const result = parseMarkdownToIR(markdown);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(1);
        const numberedBlock = result.value[0] as NumberedBlock;
        expect(numberedBlock.kind).toBe("NumberedList");
        expect(numberedBlock.content).toHaveLength(3);

        const items = ["Fifth item", "Tenth item", "Hundredth item"];
        numberedBlock.content.forEach((item, index) => {
          if (item.kind === "NumberedItem") {
            expect(item.content).toEqual([[items[index]]]);
          }
        });
      }
    });

    it("should parse numbered list with indentation", () => {
      const markdown = `  1. Indented item
  2. Another indented item`;

      const result = parseMarkdownToIR(markdown);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(1);
        const numberedBlock = result.value[0] as NumberedBlock;
        expect(numberedBlock.kind).toBe("NumberedList");
        expect(numberedBlock.content).toHaveLength(2);

        const item1 = numberedBlock.content[0];
        if (item1.kind === "NumberedItem") {
          expect(item1.content).toEqual([["Indented item"]]);
        }

        const item2 = numberedBlock.content[1];
        if (item2.kind === "NumberedItem") {
          expect(item2.content).toEqual([["Another indented item"]]);
        }
      }
    });
  });

  describe("Code Blocks", () => {
    it("should parse a fenced code block without a language", () => {
      const markdown = [
        "```",
        "const value = 1;",
        "console.log(value);",
        "```",
      ].join("\n");

      const result = parseMarkdownToIR(markdown);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(1);
        const codeBlock = result.value[0] as CodeBlockNode;
        expect(codeBlock.kind).toBe("CodeBlock");
        expect(codeBlock.language).toBeUndefined();
        expect(codeBlock.content).toEqual(["const value = 1;", "console.log(value);"]);
      }
    });

    it("should parse a fenced code block with a language", () => {
      const markdown = [
        "```ts",
        "const value: number = 1;",
        "```",
      ].join("\n");

      const result = parseMarkdownToIR(markdown);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(1);
        const codeBlock = result.value[0] as CodeBlockNode;
        expect(codeBlock.kind).toBe("CodeBlock");
        expect(codeBlock.language).toBe("ts");
        expect(codeBlock.content).toEqual(["const value: number = 1;"]);
      }
    });
  });

  describe("Mixed Content", () => {
    it("should parse a document with headers and paragraphs", () => {
      const markdown = `# Title

This is a paragraph under the title.

## Subtitle

Another paragraph here.`;

      const result = parseMarkdownToIR(markdown);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(4);
        expect(result.value[0].kind).toBe("Header");
        expect(result.value[1].kind).toBe("Paragraph");
        expect(result.value[2].kind).toBe("Header");
        expect(result.value[3].kind).toBe("Paragraph");
      }
    });

    it("should parse a document with all element types", () => {
      const markdown = `# Main Title

This is an introduction paragraph.

## Section 1

Some text here.

- Bullet point one
- Bullet point two

More text between lists.

1. Numbered item one
2. Numbered item two

### Subsection

Final paragraph.`;

      const result = parseMarkdownToIR(markdown);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.length).toBeGreaterThan(0);

        // Check that we have different node types
        const kinds = result.value.map((node) => node.kind);
        expect(kinds).toContain("Header");
        expect(kinds).toContain("Paragraph");
        expect(kinds).toContain("BulletedList");
        expect(kinds).toContain("NumberedList");
      }
    });

    it("should parse a document with a fenced code block", () => {
      const markdown = [
        "# Title",
        "",
        "Intro paragraph.",
        "",
        "```js",
        "const answer = 42;",
        "console.log(answer);",
        "```",
        "",
        "Final paragraph.",
      ].join("\n");

      const result = parseMarkdownToIR(markdown);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(4);
        expect(result.value[0].kind).toBe("Header");
        expect(result.value[1].kind).toBe("Paragraph");
        expect(result.value[2].kind).toBe("CodeBlock");
        expect(result.value[3].kind).toBe("Paragraph");

        const codeBlock = result.value[2] as CodeBlockNode;
        expect(codeBlock.language).toBe("js");
        expect(codeBlock.content).toEqual([
          "const answer = 42;",
          "console.log(answer);",
        ]);
      }
    });

    it("should handle lists separated by blank lines", () => {
      const markdown = `- First list item

- Second list separated`;

      const result = parseMarkdownToIR(markdown);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        // Should create two separate bullet blocks
        expect(result.value).toHaveLength(2);

        const list1 = result.value[0] as BulletBlock;
        expect(list1.kind).toBe("BulletedList");
        expect(list1.content).toHaveLength(1);
        const item1 = list1.content[0];
        if (item1.kind === "BulletItem") {
          expect(item1.content).toEqual([["First list item"]]);
        }

        const list2 = result.value[1] as BulletBlock;
        expect(list2.kind).toBe("BulletedList");
        expect(list2.content).toHaveLength(1);
        const item2 = list2.content[0];
        if (item2.kind === "BulletItem") {
          expect(item2.content).toEqual([["Second list separated"]]);
        }
      }
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty input", () => {
      const markdown = "";
      const result = parseMarkdownToIR(markdown);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(0);
      }
    });

    it("should handle input with only blank lines", () => {
      const markdown = "\n\n\n";
      const result = parseMarkdownToIR(markdown);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(0);
      }
    });

    it("should handle mixed blank lines", () => {
      const markdown = `

# Header


Paragraph


`;

      const result = parseMarkdownToIR(markdown);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(2);
        expect(result.value[0].kind).toBe("Header");
        expect(result.value[1].kind).toBe("Paragraph");
      }
    });

    it("should handle content that looks like markdown but is not at line start", () => {
      const markdown = "This # is not a header";
      const result = parseMarkdownToIR(markdown);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(1);
        const node = result.value[0] as ParagraphNode;
        expect(node.kind).toBe("Paragraph");
      }
    });
  });
});
