import type { BaseNode } from "./types";

// Structural check for RNode instances — plain strings and Signals are not nodes.
export const isNode = (v: unknown): v is BaseNode =>
  typeof v === "object" && v !== null && "el" in v && "unmount" in v;
