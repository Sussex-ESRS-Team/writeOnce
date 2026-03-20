import { Err, Result } from "ts-results-es";
import type { IRNode } from "./types";

export function parseHtmlToIR(_html: string): Result<IRNode[], Error> {
  return Err(new Error("Not implemented"));
}