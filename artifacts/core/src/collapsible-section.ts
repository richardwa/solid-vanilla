import { BaseNode, h } from "./rnode";
import { getValue, OptionalSignal, Signal } from "./signal";
import { div } from "./base-components";

type Props = {
  open?: OptionalSignal<boolean>;
  title?: OptionalSignal<BaseNode | string>;
  contents?: OptionalSignal<BaseNode>;
};
export const collapsibleSection = (props: Props) => {
  const { open } = props;
  const node = h("details");
  const openVal = () => getValue(props.open);
  const title = () => getValue(props.title) ?? "";
  const contents = () => getValue(props.contents) ?? div();

  if (open instanceof Signal) {
    node.on("toggle", (event) => {
      open.set(event.target.open);
    });
  }

  return node
    .css("margin-bottom", "1rem")
    .attr("open", () => (openVal() ? "open" : null))
    .inner(h("summary").inner(title), contents);
};
