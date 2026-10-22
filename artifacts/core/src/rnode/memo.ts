import { debug } from "./debug";
import { isNode } from "./guards";
import type { BaseNode, ChildNode, RNodeInternals } from "./types";

// Memoizes a child on this node, keyed by `key`. When the same key is
// requested again the cached node is reused instead of rebuilt. The cache
// entry self-deletes when the node is unmounted.
export function applyMemo(
  node: RNodeInternals,
  key: string | number,
  fn: () => BaseNode | string,
): ChildNode {
  const localMemoMap = node.memoMap ?? new Map<string | number, ChildNode>();
  if (node.memoMap === undefined) {
    node.memoMap = localMemoMap;
  }
  const val = localMemoMap.get(key);
  if (val) {
    debug("RNode", "cache hit", key);
    return val;
  }
  debug("RNode", "cache miss", key);
  const newVal = fn();
  if (isNode(newVal)) {
    newVal.onUnmount(() => {
      localMemoMap.delete(key);
    });
  }
  localMemoMap.set(key, newVal);
  return newVal;
}
