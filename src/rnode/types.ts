import type { OptionalSignal } from "../signal";

// Public shape of a reactive DOM node.
export type BaseNode = {
  el: HTMLElement;
  inner(first?: OptionalSignal<BaseNode | string>): BaseNode;
  inner(...nodes: OptionalSignal<BaseNode>[]): BaseNode;
  unmount(): void;
  onUnmount(fn: () => void): unknown;
};
export type ChildNode = BaseNode | string | undefined;
export type AttributeValue = string | null | undefined;

// Cleanup returned for one dynamic child slot; `keep` spares a child that is
// re-passed to a subsequent inner() call (e.g. a memoized node).
export type ChildEffectCleanup = (
  keep?: Set<OptionalSignal<ChildNode>>,
) => void;

// Internals the helper modules operate on (the RNode class satisfies this).
export interface RNodeInternals extends BaseNode {
  childrenSet: Set<OptionalSignal<ChildNode>>;
  unmountListeners: Array<() => void>;
  childEffectCleanups: Array<ChildEffectCleanup>;
  memoMap?: Map<string | number, ChildNode>;
  createEffect<T>(fn: () => T): T;
}
