import { Signal, OptionalSignal } from "../signal";
import { runEffect } from "./effect";
import { isNode } from "./guards";
import type {
  BaseNode,
  ChildNode,
  ChildEffectCleanup,
  RNodeInternals,
} from "./types";

// Replaces the node rendered for one dynamic child slot. The slot's position
// is marked by a permanent comment-node anchor, so updates insert relative to
// the anchor instead of indexing into el.children (which only counts
// elements, not text nodes). Returns a cleanup that unsubscribes the effect
// and unmounts the child it last rendered (unless `keep` says it survives).
function resolveChildSlot(
  node: RNodeInternals,
  fn: () => ChildNode,
  anchor: Comment,
): ChildEffectCleanup {
  const clears: Array<() => void> = [];
  let current: Text | HTMLElement | null = null;
  let currentRNode: BaseNode | undefined;

  const run = () => {
    const child = fn();
    const resolved: string | HTMLElement =
      child == null ? "" : typeof child === "string" ? child : child.el;

    // skip no-op updates
    if (currentRNode === child) return;
    if (
      current instanceof Text &&
      typeof resolved === "string" &&
      current.textContent === resolved
    ) {
      return;
    }

    const next: Text | HTMLElement =
      typeof resolved === "string"
        ? document.createTextNode(resolved)
        : resolved;

    if (currentRNode) {
      currentRNode.unmount();
      currentRNode = undefined;
    } else if (current) {
      current.remove();
    }
    node.el.insertBefore(next, anchor);
    current = next;
    if (isNode(child)) {
      currentRNode = child;
    }
  };

  runEffect(run, (clear) => {
    clears.push(clear);
    node.unmountListeners.push(clear);
  });

  return (keep?: Set<OptionalSignal<ChildNode>>) => {
    clears.forEach((clear) => clear());
    if (currentRNode && !(keep && keep.has(currentRNode))) {
      currentRNode.unmount();
    }
    currentRNode = undefined;
    current = null;
  };
}

// Implements RNode.inner: rebuilds the node's children from static strings,
// RNodes, signals and getters. Dynamic children get comment-node anchors and
// effects tracked in childEffectCleanups, so a later inner() call (or unmount)
// can dispose them.
export function applyChildren(
  node: RNodeInternals,
  newChildren: OptionalSignal<ChildNode>[],
) {
  const newChildrenSet = new Set(newChildren);

  // dispose effects created by the previous inner() call before rebuilding
  const staleCleanups = node.childEffectCleanups;
  node.childEffectCleanups = [];
  staleCleanups.forEach((cleanup) => cleanup(newChildrenSet));

  // unmount children that are not part of the new set
  node.childrenSet.forEach((child) => {
    if (!newChildrenSet.has(child) && isNode(child)) {
      child.unmount();
    }
  });

  const dynamic: Array<{ fn: () => ChildNode; anchor: Comment }> = [];
  const parts: Array<string | HTMLElement | Comment> = [];
  for (const child of newChildren) {
    if (child == null) continue;
    if (child instanceof Signal) {
      const anchor = document.createComment("");
      dynamic.push({ fn: () => child.get(), anchor });
      parts.push(anchor);
    } else if (typeof child === "function") {
      const anchor = document.createComment("");
      dynamic.push({ fn: child as () => ChildNode, anchor });
      parts.push(anchor);
    } else if (typeof child === "string") {
      parts.push(document.createTextNode(child));
    } else {
      parts.push(child.el);
    }
  }
  node.el.replaceChildren(...parts);

  // anchors are in the DOM now, so the first effect run can insert after them
  for (const { fn, anchor } of dynamic) {
    node.childEffectCleanups.push(resolveChildSlot(node, fn, anchor));
  }

  node.childrenSet = newChildrenSet;
}
