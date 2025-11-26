import { hbox, vbox, div, fragment, grid } from "../lib/base-components";
import { ClickLink, NumberInput, Title } from "./components";
import { signal } from "../lib";
import { fetchJson, GitLog } from "../../common/interface";
import { formatDate } from "../../common/util";

const logRow = (log: GitLog) =>
  fragment().inner(
    div().inner(log.commitHash.slice(0, 10)),
    div().inner(formatDate(log.commitDate)),
    div().inner(log.commitAuthor),
    div().inner(log.commitMessage),
  );

export const GitDemo = () => {
  const maxLines = signal(5);
  const selectedBranch = signal<string>();

  return vbox()
    .css("gap", "1rem")
    .inner(
      div().inner(div().inner("log limit: "), NumberInput(maxLines)),
      hbox()
        .css("gap", "1rem")
        .inner(
          Title().inner("Branches"),
          fragment().do(async (node) => {
            const branches = await fetchJson("gitBranches");
            selectedBranch.set(branches[0]);
            node.inner(
              ...branches.map((branch) =>
                ClickLink()
                  .attr("font-weight", () =>
                    selectedBranch.get() === branch ? "bold" : "normal",
                  )
                  .on("click", () => selectedBranch.set(branch))
                  .inner(branch),
              ),
            );
          }),
        ),
      vbox().inner(
        grid("repeat(4,max-content)")
          .css("column-gap", "1rem")
          .watch([maxLines, selectedBranch], async (node) => {
            const branch = selectedBranch.get();
            if (branch) {
              const logs = await fetchJson("gitLogs", branch, maxLines.get());
              node.inner(
                ...logs.map((log) =>
                  node.memo(
                    [selectedBranch.get(), log.commitHash].join(" "),
                    () => logRow(log),
                  ),
                ),
              );
            }
          }),
      ),
    );
};
