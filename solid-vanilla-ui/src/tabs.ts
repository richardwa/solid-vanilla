import { fragment, hbox, signal, vbox, BaseNode } from "solid-vanilla";
import { Button } from "./components";

export type Tab = { label: string; content: () => BaseNode };

/** Tabbed panel: label buttons on top, lazy content area below. Each tab's
 *  content node is created on first activation and reused afterwards, so
 *  its internal watches stay alive. initial selects the starting tab;
 *  onTabChange(i) fires when the user switches tabs. */
export const Tabs = (
  items: Tab[],
  initial = 0,
  onTabChange?: (index: number) => void,
) => {
  const active = signal(initial);
  return vbox().inner(
    hbox()
      .css("gap", "0.25rem")
      .css("border-bottom", "1px solid var(--pico-muted-border-color)")
      .watch(active, (node) =>
        node.inner(
          ...items.map((item, i) =>
            Button()
              .css("margin-bottom", "-1px")
              .css("border-radius", "0.25rem 0.25rem 0 0")
              .do((b) => {
                if (active.get() === i) {
                  b.css("background", "var(--pico-secondary-background)").css(
                    "border-bottom",
                    "2px solid var(--pico-primary)",
                  );
                } else {
                  b.cn("outline");
                }
              })
              .on("click", () => {
                if (active.get() !== i) onTabChange?.(i);
                active.set(i);
              })
              .inner(item.label),
          ),
        ),
      ),
    fragment().watch(active, (node) =>
      node.inner(
        node.memo(`tab${active.get()}`, () => items[active.get()].content()),
      ),
    ),
  );
};
