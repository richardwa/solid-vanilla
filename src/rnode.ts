import { Signal, observers, OptionalSignal } from "./signal";

const debug = (...msg: any[]) => {
  // @ts-ignore
  if (import.meta.env.DEV) {
    console.debug(RNode.name, ...msg);
  }
};

export type BaseNode = {
  el: HTMLElement;
  inner(first?: OptionalSignal<BaseNode | string>): BaseNode;
  inner(...nodes: OptionalSignal<BaseNode>[]): BaseNode;
};
export type ChildNode = BaseNode | string | undefined;
type AttributeValue = string | null | undefined;

type ChildEffectCleanup = (keep?: Set<OptionalSignal<ChildNode>>) => void;

export class RNode implements BaseNode {
  el: HTMLElement;
  childrenSet: Set<OptionalSignal<ChildNode>>;
  unmountListeners: Array<() => void>;
  // effects created by the last inner() call; disposed when inner() runs again
  childEffectCleanups: Array<ChildEffectCleanup>;
  memoMap?: Map<string | number, ChildNode>;

  constructor(tag: string) {
    this.el = document.createElement(tag);
    this.childrenSet = new Set();
    this.unmountListeners = [];
    this.childEffectCleanups = [];
  }

  unmount() {
    this.el.remove();
    debug("unmounted");
    const cleanups = this.childEffectCleanups;
    this.childEffectCleanups = [];
    cleanups.forEach((cleanup) => cleanup());
    this.childrenSet.forEach((r) => {
      if (r instanceof RNode) r.unmount();
    });
    this.unmountListeners.forEach((fn) => fn());
  }

  onUnmount(fn: () => void) {
    this.unmountListeners.push(fn);
    return this;
  }

  watch(
    signals: Signal<unknown> | Signal<unknown>[],
    fn: (n: RNode) => void,
    now = true,
  ) {
    const register = (signal: Signal<unknown>) => {
      const clear = signal.on(() => fn(this), now);
      this.unmountListeners.push(clear);
    };
    if (Array.isArray(signals)) {
      signals.forEach(register);
    } else {
      register(signals);
    }
    return this;
  }

  setInterval(fn: (n: BaseNode) => void, interval: number) {
    const id = setInterval(() => {
      fn(this);
    }, interval);
    this.unmountListeners.push(() => clearInterval(id));
    return id;
  }

  memo(key: string | number, fn: () => BaseNode | string) {
    const localMemoMap = this.memoMap ?? new Map();
    if (this.memoMap === undefined) {
      this.memoMap = localMemoMap;
    }
    const val = localMemoMap.get(key);
    if (val) {
      debug("cache hit", key);
      return val;
    }
    debug("cache miss", key);
    const newVal = fn();
    if (newVal instanceof RNode) {
      newVal.onUnmount(() => {
        localMemoMap.delete(key);
      });
    }
    localMemoMap.set(key, newVal);
    return newVal;
  }

  // Replaces the node rendered for one dynamic child slot. The slot's position
  // is marked by a permanent comment-node anchor, so updates insert relative to
  // the anchor instead of indexing into el.children (which only counts
  // elements, not text nodes). Returns a cleanup that unsubscribes the effect
  // and unmounts the child it last rendered (unless `keep` says it survives).
  private _innerResolveSignal(fn: () => ChildNode, anchor: Comment) {
    const clears: Array<() => void> = [];
    let current: Text | HTMLElement | null = null;
    let currentRNode: RNode | undefined;

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
      this.el.insertBefore(next, anchor);
      current = next;
      if (child instanceof RNode) {
        currentRNode = child;
      }
    };

    observers.push((signal) => {
      const clear = signal.on(run);
      clears.push(clear);
      this.unmountListeners.push(clear);
    });
    run();
    observers.pop();

    return (keep?: Set<OptionalSignal<ChildNode>>) => {
      clears.forEach((clear) => clear());
      if (currentRNode && !(keep && keep.has(currentRNode))) {
        currentRNode.unmount();
      }
      currentRNode = undefined;
      current = null;
    };
  }

  inner(...newChildren: OptionalSignal<ChildNode>[]) {
    const newChildrenSet = new Set(newChildren);

    // dispose effects created by the previous inner() call before rebuilding
    const staleCleanups = this.childEffectCleanups;
    this.childEffectCleanups = [];
    staleCleanups.forEach((cleanup) => cleanup(newChildrenSet));

    // unmount children that are not part of the new set
    this.childrenSet.forEach((child) => {
      if (!newChildrenSet.has(child) && child instanceof RNode) {
        child.unmount();
      }
    });

    const dynamic: Array<{ fn: () => ChildNode; anchor: Comment }> = [];
    const parts: Node[] = [];
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
    this.el.replaceChildren(...parts);

    // anchors are in the DOM now, so the first effect run can insert after them
    for (const { fn, anchor } of dynamic) {
      this.childEffectCleanups.push(this._innerResolveSignal(fn, anchor));
    }

    this.childrenSet = newChildrenSet;
    return this as BaseNode;
  }

  createEffect<T>(fn: () => T) {
    observers.push((signal) => {
      const clear = signal.on(fn);
      this.unmountListeners.push(clear);
    });
    const val = fn();
    observers.pop();
    return val;
  }

  private _setAttr(key: string, val: AttributeValue) {
    const element = this.el;
    if (val === null) {
      element.removeAttribute(key);
    } else if (val === undefined) {
      element.setAttribute(key, "");
    } else {
      element.setAttribute(key, val);
    }
  }

  attr(
    key: string,
    val?: AttributeValue | (() => AttributeValue) | Signal<AttributeValue>,
  ) {
    const element = this.el;
    if (key == null) {
      while (element.attributes.length > 0) {
        element.removeAttribute(element.attributes[0].name);
      }
    } else if (val instanceof Signal) {
      this.createEffect(() => {
        this._setAttr(key, val.get());
      });
    } else if (typeof val === "function") {
      this.createEffect(() => {
        this._setAttr(key, val());
      });
    } else {
      this._setAttr(key, val);
    }

    return this;
  }

  private _cn(name: string, add: boolean) {
    if (add) {
      this.el.classList.add(name);
    } else {
      this.el.classList.remove(name);
    }
  }

  cn(name: string | (() => string) | Signal<string>, add = true) {
    if (name instanceof Signal) {
      this.createEffect(() => {
        this._cn(name.get(), add);
      });
    } else if (typeof name === "function") {
      this.createEffect(() => {
        this._cn(name(), add);
      });
    } else {
      this._cn(name, add);
    }
    return this;
  }

  css(name: string, val: string | (() => string) | Signal<string>) {
    const element = this.el;
    const _name = name as unknown as number;

    if (val instanceof Signal) {
      this.createEffect(() => {
        element.style[_name] = val.get();
      });
    } else if (typeof val === "function") {
      this.createEffect(() => {
        element.style[_name] = val();
      });
    } else {
      element.style[_name] = val;
    }
    return this;
  }

  on(event: string, fn: (event: any) => void) {
    const element = this.el;
    if (event == null) {
      // true keeps children, false removes them
      const cleanElement = element.cloneNode(true);
      element.replaceWith(cleanElement);
    } else {
      this.el.addEventListener(event, fn);
    }
    return this;
  }

  do(fn: (node: RNode) => void) {
    fn(this);
    return this;
  }
}

export const h = (tag: string) => new RNode(tag);

export const render = (
  element: HTMLElement | null,
  ...nodes: Array<BaseNode | string>
) => {
  if (!element) throw "missing root element";

  const elements = nodes.map((r) => (typeof r === "string" ? r : r.el));
  element.replaceChildren(...elements);
};
