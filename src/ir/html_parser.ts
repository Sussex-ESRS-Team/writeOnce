import { Ok, Err, Result } from "ts-results-es";
import { match } from "ts-pattern";
import type {
  BulletItemNode,
  CodeSpan,
  CodeBlockNode,
  EmphasisSpan,
  ImageSpan,
  ImageNode,
  IRNode,
  IRSubNode,
  LinkSpan,
  ListBlock,
  NumberedItemNode,
  Span,
  StrongSpan,
} from "./types";
import { isIRNode } from "./types";

type Token =
  | { type: "open"; tag: string; href?: string; className?: string }
  | { type: "self"; tag: string; href?: string; alt?: string; className?: string }
  | { type: "text"; content: string }
  | { type: "close"; tag: string };

type InlineSubNode = EmphasisSpan | StrongSpan | LinkSpan | ImageSpan | CodeSpan;

type BuildChild = string | InlineSubNode | BulletItemNode | NumberedItemNode | ListBlock;

type BuildFrame = {
  tag: string;
  children: BuildChild[];
  href?: string;
  className?: string;
  parentTag?: string;
  nestedLists: ListBlock[];
};

type ParseState = {
  parsedNodes: IRNode[];
  stack: string[];
  buildStack: BuildFrame[];
};

function parseTagName(raw: string): string {
  return raw.replace(/\/$/, "").trim().split(/\s+/, 1)[0] ?? "";
}

function extractAttribute(raw: string, name: string): string | undefined {
  const pattern = new RegExp(`${name}\\s*=\\s*([\"'])(.*?)\\1`);
  const result = raw.match(pattern);
  return result?.[2];
}

function isListBlockNode(node: unknown): node is ListBlock {
  return (
    typeof node === "object" &&
    node !== null &&
    "kind" in node &&
    ((node as { kind?: string }).kind === "BulletedList" ||
      (node as { kind?: string }).kind === "NumberedList")
  );
}

function isInlineSubNode(node: unknown): node is InlineSubNode {
  return (
    typeof node === "object" &&
    node !== null &&
    "kind" in node &&
    ((node as { kind?: string }).kind === "Emphasis" ||
      (node as { kind?: string }).kind === "Strong" ||
      (node as { kind?: string }).kind === "Link" ||
      (node as { kind?: string }).kind === "InlineImage" ||
      (node as { kind?: string }).kind === "Code")
  );
}

function hasListBlock(children: BuildChild[]): boolean {
  return children.some(
    (child) => typeof child === "object" && child !== null && isListBlockNode(child),
  );
}

function toInlineChildren(children: BuildChild[]): Span[] {
  return children.filter(
    (child): child is Span => typeof child === "string" || isInlineSubNode(child),
  );
}

function collectListChildren(
  children: BuildChild[],
  kind: "ul",
): Array<BulletItemNode | ListBlock>;
function collectListChildren(
  children: BuildChild[],
  kind: "ol",
): Array<NumberedItemNode | ListBlock>;
function collectListChildren(children: BuildChild[], kind: "ul" | "ol") {
  const result: Array<BulletItemNode | NumberedItemNode | ListBlock> = [];
  const itemKind = kind === "ul" ? "BulletItem" : "NumberedItem";

  for (const child of children) {
    if (typeof child === "string") {
      if (child.trim() === "") {
        continue;
      }
      throw new Error("Could not parse html");
    }

    if (isListBlockNode(child)) {
      result.push(child);
      continue;
    }

    if (child.kind === itemKind) {
      result.push(child);
      continue;
    }

    throw new Error("Could not parse html");
  }

  return kind === "ul"
    ? (result as Array<BulletItemNode | ListBlock>)
    : (result as Array<NumberedItemNode | ListBlock>);
}

function isCodeSpan(value: unknown): value is CodeSpan {
  return (
    typeof value === "object" &&
    value !== null &&
    "kind" in value &&
    (value as { kind?: string }).kind === "Code"
  );
}

function tokenizeHtml(html: string): Result<Token[], Error> {
  const tokens: Token[] = [];
  let i = 0;

  while (i < html.length) {
    const char = html[i];

    if (char === "<") {
      const end = html.indexOf(">", i);
      if (end === -1) {
        return Err(new Error("Could not parse html"));
      }

      const inside = html.slice(i + 1, end).trim();
      if (inside.startsWith("/")) {
        const closingTag = parseTagName(inside.slice(1));
        if (closingTag === "") {
          return Err(new Error("Could not parse html"));
        }
        tokens.push({ type: "close", tag: closingTag });
      } else {
        const tag = parseTagName(inside);
        if (tag === "") {
          return Err(new Error("Could not parse html"));
        }
        tokens.push({
          type: tag === "img" ? "self" : "open",
          tag,
          href:
            tag === "img"
              ? extractAttribute(inside, "src")
              : tag === "a"
                ? extractAttribute(inside, "href")
                : undefined,
          alt: tag === "img" ? extractAttribute(inside, "alt") : undefined,
          className: tag === "code" ? extractAttribute(inside, "class") : undefined,
        });
      }

      i = end + 1;
      continue;
    }

    const nextTag = html.indexOf("<", i);
    if (nextTag === -1) {
      const text = html.slice(i);
      if (text !== "") {
        tokens.push({ type: "text", content: text });
      }
      break;
    }

    const text = html.slice(i, nextTag);
    if (text !== "") {
      tokens.push({ type: "text", content: text });
    }
    i = nextTag;
  }

  return Ok(tokens);
}

function handleOpenToken(token: Extract<Token, { type: "open" }>, state: ParseState): void {
  state.stack.push(token.tag);

  const parent = state.buildStack[state.buildStack.length - 1];
  state.buildStack.push({
    tag: token.tag,
    children: [],
    href: token.href,
    className: token.className,
    parentTag: parent?.tag,
    nestedLists: [],
  });
}

function handleSelfClosingToken(
  token: Extract<Token, { type: "self" }>,
  state: ParseState,
): Result<void, Error> {
  const parent = state.buildStack[state.buildStack.length - 1];
  let built: IRNode | IRSubNode | null;

  try {
    built = buildNode(token.tag, [], token.href, parent?.tag, token.className, token.alt);
  } catch {
    return Err(new Error("Could not parse html"));
  }

  if (!built) {
    return Err(new Error("Could not parse html"));
  }

  if (!parent) {
    if (isIRNode(built)) {
      state.parsedNodes.push(built);
      return Ok(undefined);
    }

    return Err(new Error("Could not parse html"));
  }

  if (isIRNode(built)) {
    return Err(new Error("Could not parse html"));
  }

  parent.children.push(built);
  return Ok(undefined);
}

function handleTextToken(
  token: Extract<Token, { type: "text" }>,
  state: ParseState,
): Result<void, Error> {
  const current = state.buildStack[state.buildStack.length - 1];
  if (!current) {
    if (token.content.trim() !== "") {
      return Err(new Error("Could not parse html"));
    }
    return Ok(undefined);
  }

  current.children.push(token.content);
  return Ok(undefined);
}

function handleCloseToken(
  token: Extract<Token, { type: "close" }>,
  state: ParseState,
): Result<void, Error> {
  const top = state.stack.pop();
  if (top !== token.tag) {
    return Err(new Error("Could not parse html"));
  }

  const frame = state.buildStack.pop();
  if (!frame) {
    return Err(new Error("Could not parse html"));
  }

  const parent = state.buildStack[state.buildStack.length - 1];
  if (
    frame.tag === "code" &&
    frame.className &&
    parent?.tag === "pre" &&
    parent.className === undefined
  ) {
    parent.className = frame.className;
  }

  let built: IRNode | IRSubNode | null;
  try {
    built = buildNode(
      frame.tag,
      frame.children,
      frame.href,
      frame.parentTag,
      frame.className,
    );
  } catch {
    return Err(new Error("Could not parse html"));
  }

  if (state.buildStack.length === 0) {
    if (built && isIRNode(built)) {
      state.parsedNodes.push(built);
      return Ok(undefined);
    }

    if (built) {
      return Err(new Error("Could not parse html"));
    }

    return Ok(undefined);
  }

  if (!parent) {
    return Err(new Error("Could not parse html"));
  }

  if (built) {
    if (isListBlockNode(built) && parent.tag === "li") {
      parent.nestedLists.push(built);
      return Ok(undefined);
    }

    if (isIRNode(built)) {
      return Err(new Error("Could not parse html"));
    }

    parent.children.push(built);
    if (frame.tag === "li" && frame.nestedLists.length > 0) {
      parent.children.push(...frame.nestedLists);
    }
    return Ok(undefined);
  }

  parent.children.push(...frame.children);
  return Ok(undefined);
}

export function parseHtmlToIR(_html: string): Result<IRNode[], Error> {
  const tokenResult = tokenizeHtml(_html);
  if (tokenResult.isErr()) {
    return Err(tokenResult.error);
  }

  const tokens = tokenResult.value;

  const state: ParseState = {
    parsedNodes: [],
    stack: [],
    buildStack: [],
  };

  for (const token of tokens) {
    if (token.type === "open") {
      handleOpenToken(token, state);
      continue;
    }

    if (token.type === "self") {
      const selfResult = handleSelfClosingToken(token, state);
      if (selfResult.isErr()) {
        return Err(selfResult.error);
      }
      continue;
    }

    if (token.type === "text") {
      const textResult = handleTextToken(token, state);
      if (textResult.isErr()) {
        return Err(textResult.error);
      }
      continue;
    }

    const closeResult = handleCloseToken(token, state);
    if (closeResult.isErr()) {
      return Err(closeResult.error);
    }
  }

  if (state.stack.length !== 0) {
    return Err(new Error("Could not parse html"));
  }

  return Ok(state.parsedNodes);
}


export function buildNode(
  tag: string,
  children: BuildChild[],
  href?: string,
  parentTag?: string,
  className?: string,
  alt?: string,
): IRNode | IRSubNode | null {
  return match<string, IRNode | IRSubNode | null>(tag)
    .with("h1", "h2", "h3", "h4", "h5", "h6", () => {
      if (hasListBlock(children)) {
        throw new Error("Could not parse html");
      }
      const level = Number(tag[1]);

      return {
        kind: "Header",
        level,
        content: toInlineChildren(children),
      };
    })
    .with("p", () => {
      if (hasListBlock(children)) {
        throw new Error("Could not parse html");
      }
      return { kind: "Paragraph", content: [toInlineChildren(children)] };
    })
    .with("em", () => {
      if (hasListBlock(children)) {
        throw new Error("Could not parse html");
      }
      return { kind: "Emphasis", content: toInlineChildren(children) };
    })
    .with("strong", () => {
      if (hasListBlock(children)) {
        throw new Error("Could not parse html");
      }
      return { kind: "Strong", content: toInlineChildren(children) };
    })
    .with("a", () => {
      if (hasListBlock(children)) {
        throw new Error("Could not parse html");
      }
      return { kind: "Link", href: href ?? "", content: toInlineChildren(children) };
    })
    .with("img", () => {
      if (parentTag === undefined) {
        return { kind: "Image", href: href ?? "", alt } satisfies ImageNode;
      }

      return { kind: "InlineImage", href: href ?? "", alt } satisfies ImageSpan;
    })
    .with("code", () => {
      if (hasListBlock(children)) {
        throw new Error("Could not parse html");
      }
      const code = toInlineChildren(children)
        .map((child) => (typeof child === "string" ? child : ""))
        .join("");

      return {
        kind: "Code",
        code,
      } as IRSubNode;
    })
    .with("pre", () => {
      const firstChild = children[0];
      if (isCodeSpan(firstChild)) {
        const result: CodeBlockNode = {
          kind: "CodeBlock",
          content: firstChild.code.split("\n"),
        };
        if (className && className.startsWith("language-")) {
          result.language = className.replace("language-", "");
        }
        return result;
      }

      if (children.every((child) => typeof child === "string")) {
        return {
          kind: "CodeBlock",
          content: (children as string[]).join("").split("\n"),
        };
      }

      throw new Error("Could not parse html");
    })
    .with("ul", () => ({ kind: "BulletedList", content: collectListChildren(children, "ul") }))
    .with("ol", () => ({ kind: "NumberedList", content: collectListChildren(children, "ol") }))
    .with("li", () => {
      if (hasListBlock(children)) {
        throw new Error("Could not parse html");
      }

      const itemContent = [toInlineChildren(children)];
      if (parentTag === "ul") {
        return { kind: "BulletItem", content: itemContent };
      }
      if (parentTag === "ol") {
        return { kind: "NumberedItem", content: itemContent };
      }

      throw new Error("Could not parse html");
    })
    .otherwise(() => null);
}
