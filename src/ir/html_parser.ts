import { Ok, Err, Result } from "ts-results-es";
const { JSDOM } = require("jsdom");
import { match } from "ts-pattern";
import type { HeaderNode, IRNode, Line, ParagraphNode } from "./types";

export function parseHtmlToIR(_html: string): Result<IRNode[], Error> {
  const parsedNodes: IRNode[] = [];

  const dom = new JSDOM(_html);
  const doc = dom.window.document;
  
  if (doc.querySelector("parsererror")) {
  return Err(new Error("Could not parse html"));
  }
  
  for (const element of Array.from(doc.body.children)) {
    const tag = element.tagName.toLowerCase();

    const node = match(tag)
    .with("h1", "h2", "h3", "h4", "h5", "h6", () => parseHeader(element))
    .with("p", () => parseParagraph(element))
    .with("ol", () => parseLists(element)) 
    .with("ul", () => parseLists(element))
    .with("pre", () => parseCodeBlock(element))
    .otherwise(() => null);

    if(node) {
      parsedNodes.push(node);
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
      if(text.trim() != ""){
        return text;
      }
    } else if(node.nodeType === 1) {
      const el = node as Element;
      const tag = el.tagName.toLowerCase();
      switch(tag) {
        case "em": 
        return {
          kind: "Emphasis",
          content: parseLine(el)
        };
        case "strong":
        return {
          kind: "Strong",
          content: parseLine(el)
        };
        case "a":
        return {
          kind: "Link",
          href: el.getAttribute("href") ?? "",
          content: parseLine(el)
        };
        case "code":
          return {
            kind: "Code",
            code: el.textContent ?? ""
          }; 
      }

    }
    return undefined
}

export function parseLists(el :Element): ListBlock {

  const tag = el.tagName.toLowerCase();
  let listKind: "BulletedList" | "NumberedList";
  let itemKind: "BulletItem" | "NumberedItem";
  
  if(tag === "ul") {
        listKind = "BulletedList";
        itemKind = "BulletItem";
  }else{
    listKind = "NumberedList";
    itemKind = "NumberedItem";
  }

  const contents: Array<BulletItemNode | NumberedItemNode | ListBlock>  = [];

  for (const child of Array.from(el.children)) {
    if (child.tagName.toLocaleLowerCase() === "li") {
      const parsed = parseListItem(child, itemKind);
      contents.push(parsed);

      for (const sub of Array.from(child.children)) {
        const tag = sub.tagName.toLowerCase();
        if (tag === "ul" || tag === "ol") {
          contents.push(parseLists(sub));
       }
      }
    } else {
      contents.push(parseLists(child));
    }
  }

return {
  kind: listKind,
  content: contents
};

}

export function parseListItem(li: Node, itemKind): BulletItemNode | NumberedItemNode {
  const line: Span[] = []

  for (const child of li.childNodes) {
      const parsed = parseSpan(child);
      if (parsed !== undefined) {
        line.push(parsed);
      }    
  }

  if(itemKind === "BulletItem") {
    return { kind: "BulletItem", content: [line] }
  } if (itemKind === "NumberedItem") {
    return { kind: "NumberedItem", content: [line] }
  }

}

export function parseCodeBlock(el: Element): CodeBlockNode {
  const codeELement = el.querySelector("code");

  if (!codeELement) {
    throw new Error("Could not parse html");
  }
  const text = codeELement.textContent ?? "";
  const lines = text.split("\n");
  let language: string | undefined;

  const classAttribute = codeELement.getAttribute("class") ?? "";
  if (classAttribute.startsWith("language-")){
     language = classAttribute.replace("language-", "");
  }


  return {
    kind: "CodeBlock",
    content: lines,
    ...(language ? { language } : {})
  };
}