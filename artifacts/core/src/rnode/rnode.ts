import { Signal, OptionalSignal } from "../signal";
import { runEffect } from "./effect";
import { applyChildren } from "./children";
import { applyAttr, applyClass, applyCss } from "./attrs";
import { applyEvent } from "./events";
import { applyMemo } from "./memo";
import { debug } from "./debug";
import type {
  AttributeValue,
  BaseNode,
  ChildNode,
  ChildEffectCleanup,
} from "./types";

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
    debug(RNode.name, "unmounted");
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
    return applyMemo(this, key, fn);
  }

  inner(...newChildren: OptionalSignal<ChildNode>[]) {
    applyChildren(this, newChildren);
    return this as BaseNode;
  }

  createEffect<T>(fn: () => T) {
    return runEffect(fn, (clear) => this.unmountListeners.push(clear));
  }

  attr(
    key: string,
    val?: AttributeValue | (() => AttributeValue) | Signal<AttributeValue>,
  ) {
    applyAttr(this, key, val);
    return this;
  }

  cn(name: string | (() => string) | Signal<string>, add = true) {
    applyClass(this, name, add);
    return this;
  }

  css(name: string, val: string | (() => string) | Signal<string>) {
    applyCss(this, name, val);
    return this;
  }

  on(event: string, fn: (event: any) => void) {
    applyEvent(this, event, fn);
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
