import type {
  BulletBlock,
  BulletItemNode,
  HeaderNode,
  IRNode,
  Line,
  ListBlock,
  MarkerByLanguage,
  NumberedBlock,
  NumberedItemNode,
  ParagraphNode,
} from "./types";
import { Ok, Err, Result } from "ts-results-es";
export function parseMarkdownToIR(markdown: string): Result<IRNode[], Error> {
  try {
    const nodes: IRNode[] = [];
    const lines = markdown.split("\n");
    let i = 0;

    while (i < lines.length) {
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

    const headerNode: HeaderNode = {
      kind: "Header",
      level: hashes.length,
      content: [text],
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
    paragraphLines.push([lines[i]]);
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
      content: [[parsedLine?.text ?? lines[i]]],
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
      content: [[parsedLine?.text ?? lines[i]]],
    };
    block.push(numberedItemNode);
    i++;
  }

  const nblock: NumberedBlock = { kind: "NumberedList", content: block };
  return { numberedblock: nblock, endIndex: i };
}
