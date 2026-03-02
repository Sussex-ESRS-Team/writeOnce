import { describe, it, expect } from "vitest";
import { parseMarkdownToIR } from "../../src/ir/parser";
import type {
  HeaderNode,
  ParagraphNode,
  BulletBlock,
  NumberedBlock,
} from "../../src/ir/types";

describe("parseMarkdownToIR", () => {
  describe("Headers", () => {
    it("should parse a level 1 header", () => {
      const markdown = "# Hello World";
      const result = parseMarkdownToIR(markdown);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.val).toHaveLength(1);
        const header = result.val[0] as HeaderNode;
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

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.val).toHaveLength(6);

        for (let i = 0; i < 6; i++) {
          const header = result.val[i] as HeaderNode;
          expect(header.kind).toBe("Header");
          expect(header.level).toBe(i + 1);
          expect(header.content).toEqual([`Level ${i + 1}`]);
        }
      }
    });

    it("should handle headers with extra whitespace", () => {
      const markdown = "###   Lots of spaces   ";
      const result = parseMarkdownToIR(markdown);

      expect(result.ok).toBe(true);
      if (result.ok) {
        const header = result.val[0] as HeaderNode;
        expect(header.kind).toBe("Header");
        expect(header.level).toBe(3);
        expect(header.content).toEqual(["Lots of spaces   "]);
      }
    });

    it("should handle empty header content", () => {
      const markdown = "##";
      const result = parseMarkdownToIR(markdown);

      expect(result.ok).toBe(true);
      if (result.ok) {
        const header = result.val[0] as HeaderNode;
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

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.val).toHaveLength(1);
        const paragraph = result.val[0] as ParagraphNode;
        expect(paragraph.kind).toBe("Paragraph");
        expect(paragraph.content).toEqual([["This is a simple paragraph."]]);
      }
    });

    it("should parse multi-line paragraphs", () => {
      const markdown = `This is line one.
This is line two.
This is line three.`;

      const result = parseMarkdownToIR(markdown);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.val).toHaveLength(1);
        const paragraph = result.val[0] as ParagraphNode;
        expect(paragraph.kind).toBe("Paragraph");
        expect(paragraph.content).toHaveLength(3);
        expect(paragraph.content).toEqual([
          ["This is line one."],
          ["This is line two."],
          ["This is line three."],
        ]);
      }
    });

    it("should separate paragraphs by blank lines", () => {
      const markdown = `First paragraph.

Second paragraph.`;

      const result = parseMarkdownToIR(markdown);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.val).toHaveLength(2);

        const para1 = result.val[0] as ParagraphNode;
        expect(para1.kind).toBe("Paragraph");
        expect(para1.content).toEqual([["First paragraph."]]);

        const para2 = result.val[1] as ParagraphNode;
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

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.val).toHaveLength(1);
        const bulletBlock = result.val[0] as BulletBlock;
        expect(bulletBlock.kind).toBe("BulletedList");
        expect(bulletBlock.content).toHaveLength(3);

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

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.val).toHaveLength(1);
        const bulletBlock = result.val[0] as BulletBlock;
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

    it("should parse bulleted list with indentation", () => {
      const markdown = `  - Indented item 1
  - Indented item 2`;

      const result = parseMarkdownToIR(markdown);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.val).toHaveLength(1);
        const bulletBlock = result.val[0] as BulletBlock;
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

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.val).toHaveLength(1);
        const numberedBlock = result.val[0] as NumberedBlock;
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

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.val).toHaveLength(1);
        const numberedBlock = result.val[0] as NumberedBlock;
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

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.val).toHaveLength(1);
        const numberedBlock = result.val[0] as NumberedBlock;
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

  describe("Mixed Content", () => {
    it("should parse a document with headers and paragraphs", () => {
      const markdown = `# Title

This is a paragraph under the title.

## Subtitle

Another paragraph here.`;

      const result = parseMarkdownToIR(markdown);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.val).toHaveLength(4);
        expect(result.val[0].kind).toBe("Header");
        expect(result.val[1].kind).toBe("Paragraph");
        expect(result.val[2].kind).toBe("Header");
        expect(result.val[3].kind).toBe("Paragraph");
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

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.val.length).toBeGreaterThan(0);

        // Check that we have different node types
        const kinds = result.val.map((node) => node.kind);
        expect(kinds).toContain("Header");
        expect(kinds).toContain("Paragraph");
        expect(kinds).toContain("BulletedList");
        expect(kinds).toContain("NumberedList");
      }
    });

    it("should handle lists separated by blank lines", () => {
      const markdown = `- First list item

- Second list separated`;

      const result = parseMarkdownToIR(markdown);

      expect(result.ok).toBe(true);
      if (result.ok) {
        // Should create two separate bullet blocks
        expect(result.val).toHaveLength(2);

        const list1 = result.val[0] as BulletBlock;
        expect(list1.kind).toBe("BulletedList");
        expect(list1.content).toHaveLength(1);
        const item1 = list1.content[0];
        if (item1.kind === "BulletItem") {
          expect(item1.content).toEqual([["First list item"]]);
        }

        const list2 = result.val[1] as BulletBlock;
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

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.val).toHaveLength(0);
      }
    });

    it("should handle input with only blank lines", () => {
      const markdown = "\n\n\n";
      const result = parseMarkdownToIR(markdown);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.val).toHaveLength(0);
      }
    });

    it("should handle mixed blank lines", () => {
      const markdown = `

# Header


Paragraph


`;

      const result = parseMarkdownToIR(markdown);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.val).toHaveLength(2);
        expect(result.val[0].kind).toBe("Header");
        expect(result.val[1].kind).toBe("Paragraph");
      }
    });

    it("should handle content that looks like markdown but is not at line start", () => {
      const markdown = "This # is not a header";
      const result = parseMarkdownToIR(markdown);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.val).toHaveLength(1);
        const node = result.val[0] as ParagraphNode;
        expect(node.kind).toBe("Paragraph");
      }
    });
  });
});
