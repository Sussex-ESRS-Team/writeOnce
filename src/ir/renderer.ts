import type {
  IRDocument,
  IRNode,
  HeaderNode,
  ParagraphNode,
  CodeBlockNode,
  Line,
  Span,
  ListBlock,
} from "./types";

// Render header
export function render_header(headerNode: HeaderNode) {
  var header_to_render = [];
  if (headerNode.level < 1 || headerNode.level > 6) {
    return "header level is outside range please you number 1 - 6";
  }
  for (var value of headerNode.content) {
    header_to_render.push(renderSpan(value));
  }
  var rendered_header = header_to_render.join("");
  return `<h${headerNode.level}>` + rendered_header + `</h${headerNode.level}>`;
}

export function render_code_block(codeblock: CodeBlockNode) {
  var rendered_code = codeblock.content.join("\n");
  if (typeof codeblock.language === "undefined") {
    return "<pre><code>" + rendered_code + "</code></pre>";
  }
  return (
    `<pre><code class="${codeblock.language}">` +
    rendered_code +
    "</code></pre>"
  );
}

//rendered paragraph
export function render_paragraph(paragraph: ParagraphNode) {
  var paragraph_to_render = [];
  for (var value of paragraph.content) {
    paragraph_to_render.push(renderLine(value));
  }
  var rendered_paragraph = paragraph_to_render.join("<br>");
  return "<p>" + rendered_paragraph + "</p>";
}

//rendered Line
export function renderLine(line: Line) {
  var rendered_Line = "";
  for (var value of line) {
    var rendered_value = renderSpan(value);
    rendered_Line += rendered_value;
  }

  return rendered_Line;
}

//rendering span
export function renderSpan(span: Span): string {
  if (typeof span == "string") {
    return span;
  }
  switch (span.kind) {
    case "Emphasis": {
      return "<em>" + span.content.map(renderSpan).join("") + "</em>";
    }
    case "Strong": {
      return "<strong>" + span.content.map(renderSpan).join("") + "</strong>";
    }
    case "Code": {
      return "<code>" + span.code + "</code>";
    }
    case "Link": {
      return (
        `<a href="${span.href}">` +
        span.content.map(renderSpan).join("") +
        "</a>"
      );
    }
  }
}

export function render_list_block(listblock: ListBlock): string {
  const isNumbered = listblock.kind === "NumberedList";
  const itemKind = isNumbered ? "NumberedItem" : "BulletItem";
  const tag = isNumbered ? "ol" : "ul";

  const list_items_to_render: string[] = [];

  for (let value of listblock.content) {
    if (value.kind === itemKind) {
      const body = value.content.map(renderLine).join("<br>");
      list_items_to_render.push(`<li>${body}</li>`);
    } else {
      if (list_items_to_render.length > 0) {
        const last = list_items_to_render.pop()!;
        const nested = render_list_block(value as ListBlock);
        list_items_to_render.push(last.replace("</li>", nested + "</li>"));
      }
    }
  }

  return `<${tag}>${list_items_to_render.join("")}</${tag}>`;
}

export function render_document(doc: IRDocument) {
  let html_doc = "";
  for (let nodes of doc.nodes) {
    html_doc += render_node(nodes);
  }
  return html_doc;
}

export function render_node(node: IRNode) {
  switch (node.kind) {
    case "Header": {
      return render_header(node);
    }

    case "Paragraph": {
      return render_paragraph(node);
    }
    case "BulletedList": {
      return render_list_block(node);
    }
    case "NumberedList": {
      return render_list_block(node);
    }
    case "CodeBlock": {
      return render_code_block(node);
    }
  }
}
