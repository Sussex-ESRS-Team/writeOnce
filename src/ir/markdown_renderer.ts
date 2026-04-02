import { match } from "ts-pattern";
import type { Renderer } from "./types";
import type {
  Span,
  Line,
  HeaderNode,
  ParagraphNode,
  CodeBlockNode,
  ListBlock,
  IRNode,
  IRDocument,
} from "./types";

export const markdownRenderer: Renderer = {
  renderSpan: function (span: Span): string {
    if (typeof span === "string") {
      return span;
    }
    return match(span)
      .with({ kind: "Emphasis" }, (emphasis) => {
        const emphasisLine = this.renderLine(emphasis.content);
        return `*${emphasisLine}*`;
      })
      .with({ kind: "Strong" }, (strong) => {
        const strongLine = this.renderLine(strong.content);
        return `**${strongLine}**`;
      })
      .with({ kind: "Link" }, (link) => {
        const linkLine = this.renderLine(link.content);
        return `[${linkLine}](${link.href})`;
      })
      .with({ kind: "Code" }, (code) => `\`${code.code}\``)
      .exhaustive();
  },
  renderLine: function (line: Line): string {
    let newLine = "";
    for (const spn of line) {
      newLine += this.renderSpan(spn);
    }
    return newLine;
  },
  renderHeader: function (node: HeaderNode): string {
    const hash: string = "#";
    const headerString =
      hash.repeat(node.level) + " " + this.renderLine(node.content);
    return headerString;
  },
  renderParagraph: function (node: ParagraphNode): string {
    const tempLines: string[] = [];
    for (const line of node.content) {
      tempLines.push(this.renderLine(line));
    }

    const paraString = tempLines.join("\n");
    return paraString;
  },
  renderCodeBlock: function (node: CodeBlockNode): string {
    let tempLines: string[] = [];

    if (node.language) {
      tempLines.push("```" + node.language);
    } else {
      tempLines.push("```");
    }

    if (node.content.length === 0) {
      tempLines.push("");
    }
    for (const str of node.content) {
      tempLines.push(str);
    }
    tempLines.push("```");
    return tempLines.join("\n");
  },
  renderListBlock: function (listblock: ListBlock, indent?: number): string {
    const indentLevel = indent ?? 0;
    const indentStr = "    ".repeat(indentLevel);
    const items: string[] = [];
    let itemNumber = 1;

    for (const item of listblock.content) {
      // Handle nested lists
      if (item.kind === "NumberedList" || item.kind === "BulletedList") {
        items.push(this.renderListBlock(item, indentLevel + 1));
        continue;
      }

      // Process list items with type-specific prefix
      let prefix: string;
      if (item.kind === "NumberedItem") {
        prefix = `${indentStr}${itemNumber}. `;
        itemNumber++;
      } else {
        // BulletItem
        const marker = item.markerByLanguage?.markdown ?? "-";
        prefix = `${indentStr}${marker} `;
      }

      const paragraph: ParagraphNode = {
        kind: "Paragraph",
        content: item.content,
      };
      const renderedContent = this.renderParagraph(paragraph);
      items.push(`${prefix}${renderedContent}`);
    }

    return items.join("\n");
  },
  renderNode: function (node: IRNode): string {
    return match(node)
      .with({ kind: "Header" }, (header) => this.renderHeader(header))
      .with({ kind: "Paragraph" }, (paragraph) =>
        this.renderParagraph(paragraph),
      )
      .with({ kind: "BulletedList" }, (bulletedList) =>
        this.renderListBlock(bulletedList),
      )
      .with({ kind: "NumberedList" }, (numberedList) =>
        this.renderListBlock(numberedList),
      )
      .with({ kind: "CodeBlock" }, (codeBlock) =>
        this.renderCodeBlock(codeBlock),
      )
      .exhaustive();
  },
  renderDocument: function (doc: IRDocument): string {
    return doc.nodes.map((node) => this.renderNode(node)).join("\n\n");
  },
};
