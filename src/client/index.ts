import { hbox, vbox, wrap, fragment, grid } from "./lib/base-components";
import { Button, ClickLink, NumberInput, TextInput } from "./components";
import { Signal, render, RNode } from "./lib/react-like";
import { fetchJson } from "../common/interface";

const CounterDisplay = (counter: Signal<number>) => {
  return wrap()
    .css("width", "2rem")
    .css("text-align", "center")
    .watch([counter], (el) => el.inner(counter.get().toString()));
};

const GitDemo = () => {
  const maxLines = new Signal(5);
  const selectedBranch = new Signal<string | undefined>(undefined);

  const title = (s: string) => wrap(s).css("font-weight", "bold");
  return vbox()
    .css("gap", "1rem")
    .inner(
      wrap("log limit: ", NumberInput(maxLines)),
      hbox()
        .css("gap", "1rem")
        .inner(
          title("Branches"),
          fragment().do(async (node) => {
            const branches = await fetchJson("gitBranches");
            selectedBranch.set(branches[0]);
            node.inner(
              ...branches.map((branch) =>
                ClickLink(branch)
                  .on("click", () => selectedBranch.set(branch))
                  .watch([selectedBranch], (node) =>
                    node.css(
                      "font-weight",
                      selectedBranch.get() === branch ? "bold" : "normal",
                    ),
                  ),
              ),
            );
          }),
        ),
      vbox(
        title("Logs: "),
        grid("repeat(3,max-content)")
          .css("column-gap", "1rem")
          .watch([maxLines, selectedBranch], async (node) => {
            const branch = selectedBranch.get();
            if (branch) {
              const logs = await fetchJson("gitLogs", branch, maxLines.get());
              node.inner(
                ...logs.flatMap((log) => [
                  wrap(log.commitHash.slice(0, 10)),
                  wrap(log.commitDate),
                  wrap(log.commitAuthor),
                ]),
              );
            }
          }),
      ),
    );
};

render(document.getElementById("app"), GitDemo());
