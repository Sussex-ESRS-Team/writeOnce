/**
 * WriteOnce Intermediate Representation (IR) Types
 *
 * These are application-level TypeScript types intended to be used directly
 * by parsers, transformers, renderers, and editors.
 */

/** Root document node. */
export interface IRDocument {
  kind: "Document";
  nodes: IRNode[];
}

/** Union of all supported top-level and nested nodes. */
export type IRNode =
  | HeaderNode
  | ParagraphNode
  | BulletBlock
  | NumberedBlock
  | CodeBlockNode;

/** Union of non-top-level nodes used inside IR nodes and parser internals. */
export type IRSubNode =
  | BulletItemNode
  | NumberedItemNode
  | EmphasisSpan
  | StrongSpan
  | LinkSpan
  | CodeSpan;

/** Runtime type guard for top-level IR nodes. */
export function isIRNode(node: IRNode | IRSubNode): node is IRNode {
  return (
    node.kind === "Header" ||
    node.kind === "Paragraph" ||
    node.kind === "BulletedList" ||
    node.kind === "NumberedList" ||
    node.kind === "CodeBlock"
  );
}

/** Markdown-style heading (# .. ######). */
export interface HeaderNode {
  kind: "Header";
  level: number;
  content: Line;
}

/** Plain paragraph content. */
export interface ParagraphNode {
  kind: "Paragraph";
  content: Paragraph;
}

/** Paragraph container as a semantic text block. */
export type Paragraph = Line[];

/**
 * Paragraph content for a bulleted list item.
 */
export interface BulletItemNode {
  kind: "BulletItem";
  content: Paragraph;
  markerByLanguage?: MarkerByLanguage;
}

/** Paragraph content for a numbered list item. */
export interface NumberedItemNode {
  kind: "NumberedItem";
  content: Paragraph;
}

/** Any nested list block. */
export type ListBlock = BulletBlock | NumberedBlock;

/**
 * Bulleted list block (discriminated object type).
 * Content may contain bullet items and/or nested list blocks.
 */
export interface BulletBlock {
  kind: "BulletedList";
  content: Array<BulletItemNode | ListBlock>;
}

/**
 * Numbered list block (discriminated object type).
 * Content may contain numbered items and/or nested list blocks.
 */
export interface NumberedBlock {
  kind: "NumberedList";
  content: Array<NumberedItemNode | ListBlock>;
}

/**
 * Block-level code content.
 * Each array element represents one line to preserve exact line boundaries.
 */
export interface CodeBlockNode {
  kind: "CodeBlock";
  content: string[];
  language?: string;
}

/** A line is an ordered sequence of spans. */
export type Line = Span[];

/** Supported spans for richer inline formatting. */
export type Span = string | EmphasisSpan | StrongSpan | CodeSpan | LinkSpan;

export interface EmphasisSpan {
  kind: "Emphasis";
  content: Line;
}

export interface StrongSpan {
  kind: "Strong";
  content: Line;
}

export interface CodeSpan {
  kind: "Code";
  code: string;
}

export interface LinkSpan {
  kind: "Link";
  href: string;
  content: Line;
}

/** Language/view identifier (e.g. "markdown", "org", "asciidoc"). */
export type LanguageId = string;

/**
 * Marker token as represented in a given language for this bullet.
 * Kept as string to support multiple ecosystems and future formats.
 */
export type BulletMarker = string;

/**
 * Per-language bullet marker memory for a single bullet item.
 * Only languages that require/preserve marker variants need entries.
 */
export type MarkerByLanguage = Partial<Record<LanguageId, BulletMarker>>;

/** Contract that every IR renderer must satisfy. */
export interface Renderer {
  renderSpan(span: Span): string;
  renderLine(line: Line): string;
  renderHeader(node: HeaderNode): string;
  renderParagraph(node: ParagraphNode): string;
  renderCodeBlock(node: CodeBlockNode): string;
  renderListBlock(listblock: ListBlock, indent?: number): string;
  renderNode(node: IRNode): string;
  renderDocument(doc: IRDocument): string;
}
