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
    if (typeof span == "string") {
      return span;
    }
    switch(span.kind) {
      case "Emphasis": {
        const emphasisLine = this.renderLine(span.content);
        return `*${emphasisLine}*`;
      }
      case "Strong": {
        let strongLine = this.renderLine(span.content);
        return `**${strongLine}**`;
      }
      case "Link": {
        let linkLine = this.renderLine(span.content);
        return `[${linkLine}](${span.href})`;
      }
      case "Code": {
        return `\`${span.code}\``;
      }
    }
    
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
    const headerString = hash.repeat(node.level) + " " + this.renderLine(node.content);
    return headerString;
  },
  renderParagraph: function (node: ParagraphNode): string {
    const tempLines: string[] = []
    for (var line of node.content) {
       tempLines.push(this.renderLine(line));
    }
    
    const paraString = tempLines.join("\n")
    return paraString
  },
  renderCodeBlock: function (node: CodeBlockNode): string {
    let tempLines: string[] = [];
    let joinedString = "";
    let codeBlockString = "";
    
    if (node.language) {
      tempLines.push("```" + node.language)
    }else {
      tempLines.push("```");
    }
    
    if (node.content.length === 0) {
      tempLines.push("");
    }
    for (const str of node.content){
        tempLines.push(str)
    }
    tempLines.push("```");
    joinedString = tempLines.join("\n");
    codeBlockString = `${joinedString}`;
    return codeBlockString
  
  },
  renderListBlock: function (listblock: ListBlock, indent?: number): string {
    const listItems: string[] = [];
    const indents = " ";
    switch(listblock.kind) {

      case "NumberedList": {
        var value = listblock.content
        let i = 1;
        for (var point of value) {
          let item_to_push = "";
          if (point.kind === "NumberedItem") {
            var pNode: ParagraphNode = {
              kind: "Paragraph",
              content: point.content
            } 
            if(indent) {
              item_to_push = indents.repeat(indent) + `${i}.` + " " + this.renderParagraph(pNode);
            }else{
              item_to_push = `${i}.` + " " + this.renderParagraph(pNode);
            }
            
            listItems.push(item_to_push);

          } else {
            if(indent) {
              item_to_push = this.renderListBlock(point, (indent ?? 0) + 4);
            }else{
              item_to_push =  this.renderListBlock(point, (indent ?? 0) + 4);
            }

            listItems.push(item_to_push);
          }
          i += 1;
        }
        return listItems.join("\n")
      }
      case "BulletedList": {
        var val = listblock.content
        for (var pnt of val) {
          let item_to_push = "";
          if (pnt.kind === "BulletItem") {
            const marker = pnt.markerByLanguage?.markdown ?? "-";
            var pNode: ParagraphNode = {
              kind: "Paragraph",
              content: pnt.content
            }

            if(indent) {
              item_to_push = indents.repeat(indent) + marker + " " + this.renderParagraph(pNode);
            }else{
              item_to_push = marker + " " + this.renderParagraph(pNode);
            }
            
            listItems.push(item_to_push);

          } else {
            if(indent) {
              item_to_push =  this.renderListBlock(pnt, (indent ?? 0) + 4);
            }else{
              item_to_push = this.renderListBlock(pnt, (indent ?? 0) + 4);
            }

            listItems.push(item_to_push);
          }
        }
        return listItems.join("\n")
      }
    }
  },
  renderNode: function (node: IRNode): string {
    switch (node.kind) {
      case "Header":
        return this.renderHeader(node);
      case "Paragraph":
        return this.renderParagraph(node);
      case "BulletedList":
        return this.renderListBlock(node);
      case "NumberedList":
        return this.renderListBlock(node);
      case "CodeBlock":
        return this.renderCodeBlock(node);
    }
  },
  renderDocument: function (doc: IRDocument): string {
    let markdown_doc = "";
    for (let node of doc.nodes) {
      markdown_doc += this.renderNode(node);
    }
    return doc.nodes.map(node => this.renderNode(node)).join("\n\n");
  },
};
