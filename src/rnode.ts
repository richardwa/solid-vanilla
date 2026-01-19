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

export class RNode implements BaseNode {
  el: HTMLElement;
  childrenSet: Set<OptionalSignal<ChildNode>>;
  unmountListeners: Array<() => void>;
  memoMap?: Map<string | number, ChildNode>;

  constructor(tag: string) {
    this.el = document.createElement(tag);
    this.childrenSet = new Set();
    this.unmountListeners = [];
  }

  unmount() {
    this.el.remove();
    debug("unmounted");
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

  private _innerResolveSignal(fn: () => ChildNode, i: number) {
    let firstRun = true;
    return this.createEffect(() => {
      const child = fn();
      let resolved: string | HTMLElement;
      if (!child) {
        resolved = "";
      } else if (typeof child === "string") {
        resolved = child;
      } else {
        resolved = child.el;
      }
      if (firstRun) {
        firstRun = false;
      } else {
        if (typeof resolved === "string" && this.el.children.length <= 0) {
          this.el.textContent = resolved;
        } else {
          this.el.children[i].replaceWith(resolved);
        }
      }
      return resolved;
    });
  }

  inner(...newChildren: any[]) {
    const newChildElements: Array<string | HTMLElement> = newChildren
      .filter((s) => s)
      .map((r, i) => {
        if (r == null || typeof r === "string") {
          return r ?? "";
        } else if (typeof r === "function") {
          return this._innerResolveSignal(r, i);
        } else if (r instanceof Signal) {
          return this._innerResolveSignal(() => r.get(), i);
        } else {
          return r.el;
        }
      });
    this.el.replaceChildren(...newChildElements);
    const newChildrenSet = new Set(newChildren);
    this.childrenSet.forEach((child) => {
      if (!newChildrenSet.has(child) && child instanceof RNode) {
        child.unmount();
      }
    });
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
