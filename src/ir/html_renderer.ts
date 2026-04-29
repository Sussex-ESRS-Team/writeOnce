import { match } from "ts-pattern";
import type {
  IRDocument,
  IRNode,
  HeaderNode,
  ParagraphNode,
  ImageNode,
  CodeBlockNode,
  Line,
  Span,
  ListBlock,
  Renderer,
} from "./types";

export const htmlRenderer: Renderer = {
  renderSpan(span: Span): string {
    if (typeof span === "string") {
      return span;
    }
    return match(span)
      .with({ kind: "Emphasis" }, (emphasis) => {
        return (
          "<em>" +
          emphasis.content.map(htmlRenderer.renderSpan).join("") +
          "</em>"
        );
      })
      .with({ kind: "Strong" }, (strong) => {
        return (
          "<strong>" +
          strong.content.map(htmlRenderer.renderSpan).join("") +
          "</strong>"
        );
      })
      .with({ kind: "Code" }, (code) => {
        return "<code>" + code.code + "</code>";
      })
      .with({ kind: "Link" }, (link) => {
        return (
          `<a href="${link.href}">` +
          link.content.map(htmlRenderer.renderSpan).join("") +
          "</a>"
        );
      })
      .with({ kind: "InlineImage" }, (image) => {
        const alt = image.alt ?? "";
        return `<img src="${image.href}" alt="${alt}">`;
      })
      .exhaustive();
  },

  renderLine(line: Line): string {
    var rendered_Line = "";
    for (var value of line) {
      rendered_Line += htmlRenderer.renderSpan(value);
    }
    return rendered_Line;
  },

  renderHeader(node: HeaderNode): string {
    var header_to_render = [];
    if (node.level < 1 || node.level > 6) {
      return "header level is outside range please you number 1 - 6";
    }
    for (var value of node.content) {
      header_to_render.push(htmlRenderer.renderSpan(value));
    }
    return `<h${node.level}>` + header_to_render.join("") + `</h${node.level}>`;
  },

  renderParagraph(node: ParagraphNode): string {
    var paragraph_to_render = [];
    for (var value of node.content) {
      paragraph_to_render.push(htmlRenderer.renderLine(value));
    }
    return "<p>" + paragraph_to_render.join("<br>") + "</p>";
  },

  renderImage(node: ImageNode): string {
    const alt = node.alt ?? "";
    return `<img src="${node.href}" alt="${alt}">`;
  },

  renderCodeBlock(node: CodeBlockNode): string {
    var rendered_code = node.content.join("\n");
    if (typeof node.language === "undefined") {
      return "<pre><code>" + rendered_code + "</code></pre>";
    }
    return (
      `<pre><code class="${node.language}">` + rendered_code + "</code></pre>"
    );
  },

  renderListBlock(listblock: ListBlock): string {
    const isNumbered = listblock.kind === "NumberedList";
    const itemKind = isNumbered ? "NumberedItem" : "BulletItem";
    const tag = isNumbered ? "ol" : "ul";

    const list_items_to_render: string[] = [];

    for (let value of listblock.content) {
      if (value.kind === itemKind) {
        const body = value.content.map(htmlRenderer.renderLine).join("<br>");
        list_items_to_render.push(`<li>${body}</li>`);
      } else {
        if (list_items_to_render.length > 0) {
          const last = list_items_to_render.pop()!;
          const nested = htmlRenderer.renderListBlock(value as ListBlock);
          list_items_to_render.push(last.replace("</li>", nested + "</li>"));
        }
      }
    }

    return `<${tag}>${list_items_to_render.join("")}</${tag}>`;
  },

  renderNode(node: IRNode): string {
    return match(node)
      .with({ kind: "Header" }, (header) => htmlRenderer.renderHeader(header))
      .with({ kind: "Paragraph" }, (paragraph) =>
        htmlRenderer.renderParagraph(paragraph),
      )
      .with({ kind: "Image" }, (image) => htmlRenderer.renderImage(image))
      .with({ kind: "BulletedList" }, (bulletedList) =>
        htmlRenderer.renderListBlock(bulletedList),
      )
      .with({ kind: "NumberedList" }, (numberedList) =>
        htmlRenderer.renderListBlock(numberedList),
      )
      .with({ kind: "CodeBlock" }, (codeBlock) =>
        htmlRenderer.renderCodeBlock(codeBlock),
      )
      .exhaustive();
  },

  renderDocument(doc: IRDocument): string {
    let html_doc = "";
    for (let node of doc.nodes) {
      html_doc += htmlRenderer.renderNode(node);
    }
    return html_doc;
  },
};
