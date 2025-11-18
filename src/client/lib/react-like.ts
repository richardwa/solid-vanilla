export class RNode {
  el: HTMLElement;
  childrenSet: Set<RNode | string>;
  unmountListeners: Array<() => void>;
  memoMap?: Map<string | number, RNode | string>;

  constructor(tag: string) {
    this.el = document.createElement(tag);
    this.childrenSet = new Set();
    this.unmountListeners = [];
  }

  unmount() {
    this.el.remove();
    console.log("unmounted");
    this.childrenSet.forEach((r) => {
      if (typeof r !== "string") r.unmount();
    });
    this.unmountListeners.forEach((fn) => fn());
  }

  onUnmount(fn: () => void) {
    this.unmountListeners.push(fn);
    return this;
  }

  attr(key: string, val?: string | null) {
    const element = this.el;
    if (key == null) {
      while (element.attributes.length > 0) {
        element.removeAttribute(element.attributes[0].name);
      }
    } else if (val === null) {
      element.removeAttribute(key);
    } else {
      element.setAttribute(key, val ?? "");
    }
    return this;
  }

  cn(name: string, add = true) {
    if (add) {
      this.el.classList.add(name);
    } else {
      this.el.classList.remove(name);
    }
    return this;
  }

  css(name: string, ...values: any) {
    // @ts-ignore
    this.el.style[name] = values ? values.join(" ") : "";
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

  watch(signals: Signal<unknown>[], fn: (n: RNode) => void, now = true) {
    signals.forEach((s) => {
      const clear = s.on(() => fn(this), now);
      this.unmountListeners.push(clear);
    });
    return this;
  }

  do(fn: (n: RNode) => void) {
    fn(this);
    return this;
  }

  memo(key: string | number, fn: () => RNode | string) {
    const localMemoMap = this.memoMap ?? new Map();
    if (this.memoMap === undefined) {
      this.memoMap = localMemoMap;
    }
    const val = localMemoMap.get(key);
    if (
      typeof val === "string" ||
      (val instanceof RNode && val.el.isConnected)
    ) {
      return val;
    }
    const newVal = fn();
    if (newVal instanceof RNode) {
      newVal.onUnmount(() => {
        localMemoMap.delete(key);
      });
    }
    localMemoMap.set(key, newVal);
    return newVal;
  }

  inner(...newChildren: Array<RNode | string>) {
    const newChildElements = newChildren.map((r) =>
      typeof r === "string" ? r : r.el,
    );
    this.el.replaceChildren(...newChildElements);
    const newChildrenSet = new Set(newChildren);
    this.childrenSet.forEach((child) => {
      if (!newChildrenSet.has(child) && typeof child !== "string") {
        child.unmount();
      }
    });
    this.childrenSet = newChildrenSet;
    return this;
  }
}

export const h = (tag: string) => new RNode(tag);

export const render = (
  element: HTMLElement | null,
  ...nodes: Array<RNode | string>
) => {
  if (!element) throw "missing root element";

  const elements = nodes.map((r) => (typeof r === "string" ? r : r.el));
  element.replaceChildren(...elements);
};

export class Signal<T> {
  val: T;
  old?: T;
  subscribers: Set<() => void>;
  constructor(initial: T) {
    this.val = initial;
    this.subscribers = new Set();
  }
  set(newVal: T) {
    if (newVal === this.val) return;
    this.old = this.val;
    this.val = newVal;
    this.subscribers.forEach((fn) => fn());
  }

  get() {
    return this.val;
  }

  prev() {
    return this.old;
  }

  on(fn: () => void, now = false) {
    this.subscribers.add(fn);
    if (now) fn();
    // allow caller a handle on unregister
    return () => this.subscribers.delete(fn);
  }
}
