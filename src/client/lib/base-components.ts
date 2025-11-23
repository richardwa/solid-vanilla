import { h, ChildNode } from "./rnode";

export const href = (href: string, ...children: Array<ChildNode>) =>
  h("a")
    .attr("href", href)
    .inner(...children);

export const button = (...children: Array<ChildNode>) =>
  h("button")
    .attr("type", "button")
    .inner(...children);

export const div = (...children: Array<ChildNode>) =>
  h("div").inner(...children);

export const grid = (gridTemplateColumns: string) =>
  h("div")
    .css("display", "grid")
    .css("grid-template-columns", gridTemplateColumns);

export const fragment = (...children: Array<ChildNode>) =>
  h("div")
    .css("display", "contents")
    .inner(...children);

export const hbox = (...children: Array<ChildNode>) =>
  h("span")
    .css("display", "flex")
    .css("gap", ".25rem")
    .inner(...children);

export const vbox = (...children: Array<ChildNode>) =>
  h("div")
    .css("display", "flex")
    .css("flex-direction", "column")
    .css("gap", ".25rem")
    .inner(...children);
