export class RNode {
  el: HTMLElement;
  childrenSet: Set<RNode|string>;
  watchers: Array<() => void>;
  unmountCb?: () => void;

  constructor(tag: string) {
    this.el = document.createElement(tag);
    this.childrenSet = new Set<RNode|string>();
    this.watchers = [];
  }

  unmount() {
    this.el.remove();
    if (this.unmountCb) this.unmountCb();
    this.childrenSet.forEach((r) => {
      if (typeof r !== "string") r.unmount();
    });
    this.watchers.forEach((unwatch) => unwatch());
  }

  onUnmount(fn: () => void) {
    this.unmountCb = fn;
    return this;
  }

  attr(key:string, val?:string|null) {
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

  cn(name:string, on = true) {
    if (on) {
      this.el.classList.add(name);
    } else {
      this.el.classList.remove(name);
    }
    return this;
  }

  css(name:string, ...values:any) {
    // @ts-ignore
    this.el.style[name] = values ? values.join(" ") : "";
    return this;
  }

  on(event:string, fn:() => void) {
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


  watch(signals:Signal<unknown>[], fn:(n:RNode) => void, now = true) {
    signals.forEach((s) => {
      const clear = s.on(() => fn(this), now);
      this.watchers.push(clear);
    });
    return this;
  }

  inner(...newChildren:Array<RNode|string>) {
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

export const h = (tag:string) => new RNode(tag);

export const render = (element:HTMLElement|null, ...nodes:Array<RNode|string>) => {
  if (!element) throw "missing root element";

  const elements = nodes.map((r) => (typeof r === "string" ? r : r.el));
  element.replaceChildren(...elements);
};


export class Signal<T> {
  val: T;
  subscribers: Set<() => void>;
  constructor(initial:T) {
    this.val = initial;
    this.subscribers = new Set();
  }
  set(newVal:T) {
    if (newVal === this.val) return;
    this.val = newVal;
    this.subscribers.forEach((fn) => fn());
  }

  get() {
    return this.val;
  }

  on(fn:() => void, now = false) {
    this.subscribers.add(fn);
    if (now) fn();
    // allow caller a handle on unregister
    return () => this.subscribers.delete(fn);
  }
}
