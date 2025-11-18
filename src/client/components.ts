import { h, RNode } from "./lib/react-like.ts";

export const Panel = (...children:Array<RNode|string>) =>
  h("div")
    .css("border-radius", "5px")
    .css("padding", "0.5rem")
    .css("background-color", "#424242")
    .inner(...children);


export const Button = (...children:Array<RNode|string>) =>
  h("button")
    .attr("type", "button")
    .css("padding", "0.25rem")
    .inner(...children);

export const Link = (href:string, ...children:Array<RNode|string>) =>
  h("a")
    .attr("href", href)
    .attr("target", "_blank")
    .inner(...children);