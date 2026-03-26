import { Ok, Err, Result } from "ts-results-es";
const { JSDOM } = require("jsdom");
import { match } from "ts-pattern";
import type { BulletItemNode, CodeBlockNode, HeaderNode, IRNode, Line, ListBlock, NumberedItemNode, ParagraphNode, Span } from "./types";

export function parseHtmlToIR(_html: string): Result<IRNode[], Error> {
  const parsedNodes: IRNode[] = [];

  const dom = new JSDOM(_html);
  const doc = dom.window.document;
  
  if (doc.querySelector("parsererror")) {
  return Err(new Error("Could not parse html"));
  }
  
  for (const element of Array.from(doc.body.children) as Element[]) {
    const tag = element.tagName.toLowerCase();

    const node = match(tag)
      .with("h1", "h2", "h3", "h4", "h5", "h6", () => Ok<IRNode | null>(parseHeader(element)))
      .with("p", () => Ok<IRNode | null>(parseParagraph(element)))
      .with("ol", "ul", () => Ok<IRNode | null>(parseLists(element)))
      .with("pre", () => parseCodeBlock(element).map((codeBlock) => codeBlock as IRNode | null))
      .otherwise(() => Ok<IRNode | null>(null));

    if (node.isErr()) {
      return Err(node.error);
    }

    if (node.value) {
      parsedNodes.push(node.value);
    }
    
  }
  return Ok(parsedNodes);
}

export function parseHeader(el: Element): HeaderNode{
  const tagName = el.tagName.toLowerCase();
  const level = Number(tagName[1]);
  const text = el.textContent ?? "";

  return {
    kind: "Header",
    level,
    content: [text]
  }
}

export function parseParagraph(el: Element): ParagraphNode {
  return {
    kind: "Paragraph",
    content: [parseLine(el)]
  };
}

export function parseLine(el: Element): Line {
  const line: Span[] = [];
  for (const child of Array.from(el.childNodes)) {
    const parsed = parseSpan(child);

    if (parsed !== undefined) {
      line.push(parsed);
    }
  }
  return line
}

export function parseSpan(node: Node): Span | undefined {
  if (node.nodeType === 3) {
    const text = node.textContent ?? "";
    if (text.trim() !== "") {
      return text;
    }
  } else if (node.nodeType === 1) {
    const el = node as Element;
    const tag = el.tagName.toLowerCase();
    return match(tag)
      .returnType<Span | undefined>()
      .with("em", () => ({
          kind: "Emphasis",
          content: parseLine(el)
        }))
      .with("strong", () => ({
          kind: "Strong",
          content: parseLine(el)
        }))
      .with("a", () => ({
          kind: "Link",
          href: el.getAttribute("href") ?? "",
          content: parseLine(el)
        }))
      .with("code", () => ({
        kind: "Code",
        code: el.textContent ?? ""
      }))
      .otherwise(() => undefined);
  }

  return undefined
}

export function parseLists(el: Element): ListBlock {
  const tag = el.tagName.toLowerCase() as "ul" | "ol";

  return match(tag)
    .with("ul", () => ({
      kind: "BulletedList" as const,
      content: parseListContent(el, "BulletItem")
    }))
    .with("ol", () => ({
      kind: "NumberedList" as const,
      content: parseListContent(el, "NumberedItem")
    }))
    .exhaustive();
}

function parseListContent(list: Element, itemKind: "BulletItem"): Array<BulletItemNode | ListBlock>;
function parseListContent(list: Element, itemKind: "NumberedItem"): Array<NumberedItemNode | ListBlock>;
function parseListContent(
  list: Element,
  itemKind: "BulletItem" | "NumberedItem"
): Array<BulletItemNode | NumberedItemNode | ListBlock> {
  return Array.from(list.children).flatMap((child) => {
    if (child.tagName.toLowerCase() !== "li") {
      return [parseLists(child)];
    }

    const item = parseListItem(child, itemKind);
    const nestedLists = Array.from(child.children)
      .filter((sub) => {
        const subTag = sub.tagName.toLowerCase();
        return subTag === "ul" || subTag === "ol";
      })
      .map((sub) => parseLists(sub));

    return [item, ...nestedLists];
  });
}

export function parseListItem(li: Element, itemKind: "BulletItem" | "NumberedItem"): BulletItemNode | NumberedItemNode {
  const line = Array.from(li.childNodes)
    .map(parseSpan)
    .filter((span): span is Span => span !== undefined);

  return match(itemKind)
    .with("BulletItem", () => ({ kind: "BulletItem" as const, content: [line] }))
    .with("NumberedItem", () => ({ kind: "NumberedItem" as const, content: [line] }))
    .exhaustive();
}

export function parseCodeBlock(el: Element): Result<CodeBlockNode, Error> {
  const codeElement = el.querySelector("code");

  if (!codeElement) {
    return Err(new Error("Could not parse html"));
  }
  const text = codeElement.textContent ?? "";
  const lines = text.split("\n");

  const classAttribute = codeElement.getAttribute("class") ?? "";
  const language = classAttribute.startsWith("language-")
    ? classAttribute.replace("language-", "")
    : undefined;

  return Ok({
    kind: "CodeBlock",
    content: lines,
    ...(language ? { language } : {})
  });
}