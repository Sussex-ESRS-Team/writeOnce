import type {
  BulletBlock,
  BulletItemNode,
  CodeBlockNode,
  HeaderNode,
  ImageSpan,
  ImageNode,
  IRNode,
  Line,
  ListBlock,
  MarkerByLanguage,
  NumberedBlock,
  NumberedItemNode,
  ParagraphNode,
  Span,
} from "./types";
import { Ok, Err, Result } from "ts-results-es";
export function parseMarkdownToIR(markdown: string): Result<IRNode[], Error> {
  try {
    const nodes: IRNode[] = [];
    const lines = markdown.split("\n");
    let i = 0;

    while (i < lines.length) {
      const imageNode = parseImageNode(lines[i]);
      if (imageNode) {
        nodes.push(imageNode);
        i++;
        continue;
      }

      if (isFencedCodeBlockStart(lines[i])) {
        const codeBlock = getCodeBlock(lines, i);
        nodes.push(codeBlock.codeblock);
        i = codeBlock.endIndex;
        continue;
      }

      if (isHeader(lines[i])) {
        const result = getHeaderNode(lines[i]);
        if (result.isOk()) {
          nodes.push(result.value);
        }
        i++;
      } else if (isBulletedLine(lines[i])) {
        const bbl = getBulletBlock(lines, i);
        nodes.push(bbl.bulletblock);
        i = bbl.endIndex;
      } else if (isNumberedLine(lines[i])) {
        const nbl = getNumberedBlock(lines, i);
        nodes.push(nbl.numberedblock);
        i = nbl.endIndex;
      } else if (lines[i] === "") {
        i++;
        continue;
      } else {
        const para = getParagraphNode(lines, i);
        nodes.push(para.pnode);
        i = para.endindex;
      }
    }
    return Ok(nodes);
  } catch (error) {
    return Err(new Error("Could not parse markdown"));
  }
}

function getHeaderNode(line: string): Result<HeaderNode, Error> {
  //starts from the 1st line /^ matches string of hashes between 1 and 6
  const match = line.match(/^(#{1,6})\s*(.*)$/);

  if (match) {
    const hashes = match[1];
    const text = match[2];
    const content = parseInlineSpans(text);

    const headerNode: HeaderNode = {
      kind: "Header",
      level: hashes.length,
      content: content.length > 0 ? content : [""],
    };

    return Ok(headerNode);
  }
  return Err(new Error("Not a header"));
}

function getParagraphNode(
  lines: string[],
  start: number,
): { pnode: ParagraphNode; endindex: number } {
  const paragraphLines: Line[] = [];
  let i = start;

  while (i < lines.length && lines[i].trim() !== "") {
    paragraphLines.push(parseInlineSpans(lines[i]));
    i++;
  }

  const paragraphNode: ParagraphNode = {
    kind: "Paragraph",
    content: paragraphLines,
  };

  return { pnode: paragraphNode, endindex: i };
}

function parseBulletedLine(
  line: string,
): { markerByLanguage: MarkerByLanguage; text: string } | null {
  const m = line.match(/^(\s*)([-*])\s+(.*)$/);
  if (!m) return null;

  const marker = m[2];
  const text = m[3];
  if (marker === "-" || marker === "*") {
    return { markerByLanguage: { markdown: marker }, text };
  }
  return null;
}

function parseNumberedLine(line: string): { text: string } | null {
  const match = line.match(/^(\s*)(\d+)\.\s+(.*)$/);
  if (!match) return null;

  return { text: match[3] };
}

function isNumberedLine(line: string): boolean {
  return /^(\s*)(\d+)\.\s+/.test(line);
}

function isBulletedLine(line: string): boolean {
  //check if there is a - or *
  //use reg patten to check
  return /^(\s*)([-*])\s+/.test(line);
}

function isHeader(line: string): boolean {
  return /^(#{1,6})\s*(.*)$/.test(line);
}

function isFencedCodeBlockStart(line: string): boolean {
  return /^```/.test(line.trim());
}

function parseFencedCodeBlockStart(
  line: string,
): { language?: string } | null {
  const match = line.trim().match(/^```\s*([^`]*)\s*$/);
  if (!match) return null;

  const language = match[1].trim();
  return language.length > 0 ? { language } : {};
}

function getCodeBlock(
  lines: string[],
  start: number,
): { codeblock: CodeBlockNode; endIndex: number } {
  const startInfo = parseFencedCodeBlockStart(lines[start]);
  const content: string[] = [];
  let i = start + 1;

  while (i < lines.length && lines[i].trim() !== "```") {
    content.push(lines[i]);
    i++;
  }

  if (i < lines.length && lines[i].trim() === "```") {
    i++;
  }

  const codeblock: CodeBlockNode = {
    kind: "CodeBlock",
    content,
    ...startInfo,
  };

  return { codeblock, endIndex: i };
}

function getBulletBlock(
  lines: string[],
  start: number,
): { bulletblock: BulletBlock; endIndex: number } {
  let block: Array<BulletItemNode | ListBlock> = [];
  let i = start;

  while (i < lines.length && isBulletedLine(lines[i])) {
    const parsedLine = parseBulletedLine(lines[i]);
    const bulletItemNode: BulletItemNode = {
      kind: "BulletItem",
      content: [parseInlineSpans(parsedLine?.text ?? lines[i])],
      markerByLanguage: parsedLine?.markerByLanguage,
    };
    block.push(bulletItemNode);
    i++;
  }

  const bblock: BulletBlock = { kind: "BulletedList", content: block };
  return { bulletblock: bblock, endIndex: i };
}

function getNumberedBlock(
  lines: string[],
  start: number,
): { numberedblock: NumberedBlock; endIndex: number } {
  const block: Array<NumberedItemNode | ListBlock> = [];
  let i = start;

  while (i < lines.length && isNumberedLine(lines[i])) {
    const parsedLine = parseNumberedLine(lines[i]);
    const numberedItemNode: NumberedItemNode = {
      kind: "NumberedItem",
      content: [parseInlineSpans(parsedLine?.text ?? lines[i])],
    };
    block.push(numberedItemNode);
    i++;
  }

  const nblock: NumberedBlock = { kind: "NumberedList", content: block };
  return { numberedblock: nblock, endIndex: i };
}

function parseInlineSpans(text: string): Line {
  const spans: Span[] = [];
  let index = 0;

  while (index < text.length) {
    const wikiStart = text.indexOf("![[", index);
    const markdownStart = text.indexOf("![", index);
    const strongStart = text.indexOf("**", index);
    const emphasisStart = text.indexOf("*", index);
    const codeStart = text.indexOf("`", index);
    const linkStart = text.indexOf("[", index);

    let start = -1;
    let syntax:
      | "wiki"
      | "markdown"
      | "strong"
      | "emphasis"
      | "code"
      | "link"
      | null = null;

    if (wikiStart !== -1 && (markdownStart === -1 || wikiStart <= markdownStart)) {
      start = wikiStart;
      syntax = "wiki";
    } else if (markdownStart !== -1) {
      start = markdownStart;
      syntax = "markdown";
    }

    if (strongStart !== -1 && (start === -1 || strongStart < start)) {
      start = strongStart;
      syntax = "strong";
    }

    if (emphasisStart !== -1 && (start === -1 || emphasisStart < start)) {
      start = emphasisStart;
      syntax = "emphasis";
    }

    if (codeStart !== -1 && (start === -1 || codeStart < start)) {
      start = codeStart;
      syntax = "code";
    }

    if (linkStart !== -1 && (start === -1 || linkStart < start)) {
      start = linkStart;
      syntax = "link";
    }

    if (start === -1) {
      spans.push(text.slice(index));
      break;
    }

    if (start > index) {
      spans.push(text.slice(index, start));
    }

    if (syntax === "wiki") {
      const end = text.indexOf("]]", start + 3);
      if (end === -1) {
        spans.push(text.slice(start));
        break;
      }

      const raw = text.slice(start + 3, end);
      const [href, alt] = raw.split("|", 2);
      spans.push(buildImageSpan(href, alt));
      index = end + 2;
      continue;
    }

    if (syntax === "strong") {
      const end = text.indexOf("**", start + 2);
      if (end === -1) {
        spans.push(text.slice(start, start + 2));
        index = start + 2;
        continue;
      }

      spans.push({
        kind: "Strong",
        content: parseInlineSpans(text.slice(start + 2, end)),
      });
      index = end + 2;
      continue;
    }

    if (syntax === "emphasis") {
      const end = text.indexOf("*", start + 1);
      if (end === -1) {
        spans.push(text.slice(start, start + 1));
        index = start + 1;
        continue;
      }

      spans.push({
        kind: "Emphasis",
        content: parseInlineSpans(text.slice(start + 1, end)),
      });
      index = end + 1;
      continue;
    }

    if (syntax === "code") {
      const end = text.indexOf("`", start + 1);
      if (end === -1) {
        spans.push(text.slice(start, start + 1));
        index = start + 1;
        continue;
      }

      spans.push({
        kind: "Code",
        code: text.slice(start + 1, end),
      });
      index = end + 1;
      continue;
    }

    if (syntax === "link") {
      const altEnd = text.indexOf("](", start + 1);
      const hrefEnd = altEnd === -1 ? -1 : text.indexOf(")", altEnd + 2);
      if (altEnd === -1 || hrefEnd === -1) {
        spans.push(text.slice(start, start + 1));
        index = start + 1;
        continue;
      }

      spans.push({
        kind: "Link",
        href: text.slice(altEnd + 2, hrefEnd),
        content: parseInlineSpans(text.slice(start + 1, altEnd)),
      });
      index = hrefEnd + 1;
      continue;
    }

    const altEnd = text.indexOf("](", start + 2);
    const hrefEnd = altEnd === -1 ? -1 : text.indexOf(")", altEnd + 2);
    if (altEnd === -1 || hrefEnd === -1) {
      spans.push(text.slice(start, start + 2));
      index = start + 2;
      continue;
    }

    const alt = text.slice(start + 2, altEnd);
    const href = text.slice(altEnd + 2, hrefEnd);
    spans.push(buildImageSpan(href, alt));
    index = hrefEnd + 1;
  }

  return spans;
}

function parseImageNode(line: string): ImageNode | null {
  const trimmed = line.trim();

  if (trimmed.startsWith("![[") && trimmed.endsWith("]]")) {
    const raw = trimmed.slice(3, -2);
    const [href, alt] = raw.split("|", 2);
    return buildImageNode(href, alt);
  }

  const markdownMatch = trimmed.match(/^!\[(.*?)\]\((.*?)\)$/);
  if (markdownMatch) {
    return buildImageNode(markdownMatch[2], markdownMatch[1]);
  }

  return null;
}

function buildImageSpan(href: string, alt?: string): ImageSpan {
  const image: ImageSpan = {
    kind: "InlineImage",
    href,
  };

  if (typeof alt === "string" && alt.length > 0) {
    image.alt = alt;
  }

  return image;
}

function buildImageNode(href: string, alt?: string): ImageNode {
  const image: ImageNode = {
    kind: "Image",
    href,
  };

  if (typeof alt === "string" && alt.length > 0) {
    image.alt = alt;
  }

  return image;
}
