import type { RNodeInternals } from "./types";

export function applyEvent(
  node: RNodeInternals,
  event: string,
  fn: (event: any) => void,
) {
  const element = node.el;
  if (event == null) {
    // true keeps children, false removes them
    const cleanElement = element.cloneNode(true);
    element.replaceWith(cleanElement);
  } else {
    element.addEventListener(event, fn);
  }
}
