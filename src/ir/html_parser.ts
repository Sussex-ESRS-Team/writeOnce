import { Ok, Err, Result } from "ts-results-es";
import { match } from "ts-pattern";
import type { CodeBlockNode, HeaderNode, IRNode, Line, ParagraphNode } from "./types";


export function parseHtmlToIR(_html: string): Result<IRNode[], Error> {
  //tokeniser - can be done as a function
  type Token = 
  | {type: "open", tag: string, href?: string, className?: string}
  | {type: "text", content: string}
  | {type: "close", tag: string}

  const tokens: Token[] = [];

  let i = 0;

  while (i < _html.length) {
    const char = _html[i]; //grab a character 

    if (char === "<") { //check if its a tag

      const end = _html.indexOf(">", i); //grab the position of the closing tag
      if (end === -1) {
        return Err(new Error("Could not parse html")); //fails if index is negative
      }
      const inside = _html.slice(i+1, end);
      const tag = inside.split(" ")[0]; 

      //check link tag
      let href = "";
      if (tag === "a") {
        const match = inside.match(/href="([^"]*)"/);
        if (match) {
          href = match[1]
        }
      }
      //extract class attri
      let className = "";

      if (tag === "code") {
        const match = inside.match(/class="([^"]*)"/);
        if(match) {
          className = match[1]
        }
      }

      if(inside.startsWith("/")) {
        tokens.push({ type: "close", tag: inside.slice(1).trim() });
      }else {    
        tokens.push({ type: "open", tag, href, className});
      }
      i = end + 1;

    } else {

      const nextTag = _html.indexOf("<", i);
      if(nextTag === -1) {
        const text = _html.slice(i);
        tokens.push({type: "text", content: text })
        break;
      }
      
      const text = _html.slice(i, nextTag);
      tokens.push({ type: "text", content: text });
      i = nextTag;
    }
  }

  const parsedNodes: IRNode[] = [];

  const stack: string[] = [];
  type BuildFrame = {
    tag: string, 
    children: any[], 
    href?: string,
    className?: string, 
    parentTag?: string, 
    nestedLists?: ListBlock[]};  
  const buildStack: BuildFrame[] = [];

  //if its a open you push it on to the stack and if its a close you have to check that it is a tag
  for (const token of tokens) {
    if (token.type === "open") {
      stack.push(token.tag);

      const parent = buildStack[buildStack.length -1];
      buildStack.push({tag: token.tag, 
        children: [], 
        href: token.href, 
        className: token.className, 
        parentTag: parent?.tag, 
        nestedLists: []})

    } else if (token.type === "text") {

      const current = buildStack[buildStack.length - 1];

      if (current && token.content !== "") {
        current.children.push(token.content);
      }
    } else if(token.type === "close") {
      const top = stack.pop();

      if(top !== token.tag) {
        return Err(new Error("Could not parse html"))
      }

      const frame = buildStack.pop();
      if(!frame) {
        return Err(new Error("Could not parse html"))
      }
      let built;
      try {
        built = buildNode(
          frame.tag, 
          frame.children, 
          frame.href, 
          frame.parentTag,
          frame.className);
      } catch {
        return Err(new Error("Could not parse html"))
      }
      if (buildStack.length === 0) {
        if(built) {
          parsedNodes.push(built);
        }
      } else {
        const parent = buildStack[buildStack.length - 1];
        if(!parent) {
          return Err(new Error("Could not parse html"));
        }
        if (built) {
          if ((built.kind === "BulletedList" || built.kind === "NumberedList") && parent.tag === "li") {
             parent.nestedLists?.push(built);
          
          } else {
            parent.children.push(built);

            if (frame.tag === "li" && frame.nestedLists && frame.nestedLists.length > 0) {
              for (const list of frame.nestedLists) {
                parent.children.push(list);
              }
            }
          }
        } else {
          parent.children.push(...frame.children); 
        }
      } 
    }
  }
  if (stack.length !== 0) {
    return Err(new Error("Could not parse html"))
  }
  return Ok(parsedNodes);
}


export function buildNode(tag: string, children: any[], href?: string, parentTag?: string, className?: string): IRNode | null {
  return match(tag)
  .with("h1", "h2", "h3", "h4", "h5", "h6", () => {
    const level = Number(tag[1]);

    return {
      kind: "Header",
      level,
      content: children
    };
  })
  .with("p", () => ({kind: "Paragraph", content: [children]}))
  .with("em", () => ({kind: "Emphasis", content: children}))
  .with("strong", () => ({kind: "Strong", content: children}))
  .with("a", () => ({kind: "Link", href: href ?? "", content: children}))
  .with("code", () => {
    const result: any = {
      kind: "Code",
      code: children.join("")
    };
    if (className && className !=="") {
      result.className = className;
    }

    return result;
  })
  .with("pre", () => {
    const firstChild = children[0];
    
    if (firstChild && typeof firstChild === "object" && firstChild.kind === "Code") {
      const result: CodeBlockNode = {
        kind: "CodeBlock",
        content: firstChild.code.split("\n")
      };
      if (firstChild.className && firstChild.className.startsWith("language-")) {
        result.language = firstChild.className.replace("language-", "")
      }
      return result;
    }
    return {
      kind: "CodeBlock", 
      content: firstChild.code.join("").split("\n")
    };
  })
  .with("ul", () => ({kind: "BulletedList", content: children}))
  .with("ol", () => ({kind: "NumberedList", content: children}))
  .with("li", () => {
    if (parentTag === "ul") { return { kind: "BulletItem", content: [children]};}
    if (parentTag === "ol") { return { kind: "NumberedItem", content: [children]};}
    throw new Error("Could not parse html");
  })
  .otherwise(() => null);
}

