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
    throw new Error("Function not implemented.");
  },
  renderLine: function (line: Line): string {
    throw new Error("Function not implemented.");
  },
  renderHeader: function (node: HeaderNode): string {
    throw new Error("Function not implemented.");
  },
  renderParagraph: function (node: ParagraphNode): string {
    throw new Error("Function not implemented.");
  },
  renderCodeBlock: function (node: CodeBlockNode): string {
    throw new Error("Function not implemented.");
  },
  renderListBlock: function (listblock: ListBlock, indent?: number): string {
    throw new Error("Function not implemented.");
  },
  renderNode: function (node: IRNode): string {
    throw new Error("Function not implemented.");
  },
  renderDocument: function (doc: IRDocument): string {
    throw new Error("Function not implemented.");
  },
};
