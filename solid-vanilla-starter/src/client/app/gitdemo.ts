import { h, signal } from "solid-vanilla";
import {
  NumberInput,
  Page,
  Table,
  TableHeader,
  Td,
  Tr,
} from "solid-vanilla-ui";
import { fetchJson, GitLog } from "../../common/interface";
import { formatDate } from "../../common/util";

const logRow = (log: GitLog) =>
  Tr(
    Td(log.commitHash.slice(0, 10)),
    Td(formatDate(log.commitDate)),
    Td(log.commitAuthor),
    Td(log.commitMessage),
  );

export const GitDemo = () => {
  const maxLines = signal(5);
  const selectedBranch = signal<string>();

  return Page().inner(
    // label above the number input
    h("div").inner(
      h("span").inner("log limit: "),
      NumberInput(maxLines).css("display", "block"),
    ),
    h("br"),
    h("div").do(async (node) => {
      const branches = await fetchJson("gitBranches");
      selectedBranch.set(branches[0]);
      node.inner(
        ...branches.map((branch) =>
          h("a")
            .css("cursor", "pointer")
            .css("font-weight", () =>
              selectedBranch.get() === branch ? "bold" : "normal",
            )
            .css("margin-right", "1rem")
            .on("click", () => selectedBranch.set(branch))
            .inner(branch),
        ),
      );
    }),
    h("br"),
    Table().inner(
      TableHeader("Commit", "Date", "Author", "Message"),
      h("tbody").watch([maxLines, selectedBranch], (node) => {
        const branch = selectedBranch.get();
        if (branch) {
          fetchJson("gitLogs", branch, maxLines.get()).then((logs) => {
            node.inner(
              ...logs.map((log) =>
                node.memo([branch, log.commitHash].join(" "), () =>
                  logRow(log),
                ),
              ),
            );
          });
        }
      }),
    ),
  );
};
