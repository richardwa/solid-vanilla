import { BaseNode, h, hbox, Signal } from "solid-vanilla";

// Page: centered container for app content (Pico's .container look, kept
// explicit so any max-width can be passed).
export const Page = (maxWidth = "100rem") =>
  h("div")
    .css("width", "100%")
    .css("max-width", maxWidth)
    .css("margin", "0 auto")
    .css("padding", "0.5rem");

// Page header: title on the left, actions pushed to the right
// (Pico's h1/h2 spacing already provides the rule underneath).
export const PageHeader = (
  title: string | BaseNode,
  ...actions: Array<Parameters<ReturnType<typeof hbox>["inner"]>[number]>
) =>
  hbox()
    .css("align-items", "center")
    // match the 1rem horizontal padding Pico gives table cells/inputs so
    // the title lines up with the content below
    .css("padding-left", "1rem")
    .css("padding-right", "1rem")
    .css("padding-top", "0.25rem")
    .css("padding-bottom", "0.5rem")
    .inner(
      h("h3").css("margin", "0").inner(title),
      hbox()
        .css("align-items", "center")
        .css("gap", "0.75rem")
        .css("margin-left", "auto")
        .inner(...actions),
    );

// Pico <article> = card/panel styling
export const Panel = () => h("article").css("margin", "0");

export const Title = () => h("h3");

// Pico styles <button> natively; "outline"/"contrast" classes via .cn()
export const Button = () => h("button").attr("type", "button");

export const NavLink = (href: string) =>
  h("a").attr("href", href).attr("target", "_blank");

// Pico styles <a> with the primary color; cursor for JS-driven links only
export const ClickLink = () => h("a").css("cursor", "pointer");

export const HashLink = (href: string) =>
  h("a").attr("href", href).css("cursor", "pointer");

export type { Signal };
