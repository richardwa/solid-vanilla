import { Signal } from "../signal";
import type { AttributeValue, RNodeInternals } from "./types";

function setAttr(element: HTMLElement, key: string, val: AttributeValue) {
  if (val === null) {
    element.removeAttribute(key);
  } else if (val === undefined) {
    element.setAttribute(key, "");
  } else {
    element.setAttribute(key, val);
  }
}

export function applyAttr(
  node: RNodeInternals,
  key: string,
  val?: AttributeValue | (() => AttributeValue) | Signal<AttributeValue>,
) {
  const element = node.el;
  if (key == null) {
    while (element.attributes.length > 0) {
      element.removeAttribute(element.attributes[0].name);
    }
  } else if (val instanceof Signal) {
    node.createEffect(() => setAttr(element, key, val.get()));
  } else if (typeof val === "function") {
    node.createEffect(() => setAttr(element, key, val()));
  } else {
    setAttr(element, key, val);
  }
}

function setClass(element: HTMLElement, name: string, add: boolean) {
  if (add) {
    element.classList.add(name);
  } else {
    element.classList.remove(name);
  }
}

export function applyClass(
  node: RNodeInternals,
  name: string | (() => string) | Signal<string>,
  add = true,
) {
  if (name instanceof Signal) {
    node.createEffect(() => setClass(node.el, name.get(), add));
  } else if (typeof name === "function") {
    node.createEffect(() => setClass(node.el, name(), add));
  } else {
    setClass(node.el, name, add);
  }
}

export function applyCss(
  node: RNodeInternals,
  name: string,
  val: string | (() => string) | Signal<string>,
) {
  const element = node.el;
  const _name = name as unknown as number;

  if (val instanceof Signal) {
    node.createEffect(() => {
      element.style[_name] = val.get();
    });
  } else if (typeof val === "function") {
    node.createEffect(() => {
      element.style[_name] = val();
    });
  } else {
    element.style[_name] = val;
  }
}
