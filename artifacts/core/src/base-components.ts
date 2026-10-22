import { h } from "./rnode";

export const href = (href: string) => h("a").attr("href", href);

export const button = () => h("button").attr("type", "button");

export const div = () => h("div");

export const span = () => h("span");

export const grid = (gridTemplateColumns: string) =>
  h("div")
    .css("display", "grid")
    .css("grid-template-columns", gridTemplateColumns);

export const fragment = () => h("div").css("display", "contents");

export const gap = ".25rem";
export const hbox = () => h("span").css("display", "flex").css("gap", gap);

export const vbox = () =>
  h("div")
    .css("display", "flex")
    .css("flex-direction", "column")
    .css("gap", gap);
