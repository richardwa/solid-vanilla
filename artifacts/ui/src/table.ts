import { BaseNode, h, RNode } from "solid-vanilla";

export const Table = () => h("table");

export const TableHeader = (...titles: Array<string | BaseNode>) =>
  h("thead").inner(
    h("tr").inner(...titles.map((title) => h("th").inner(title))),
  );

export const Th = (...children: Array<Parameters<RNode["inner"]>[number]>) =>
  h("th").inner(...children);

export const Td = (...children: Array<Parameters<RNode["inner"]>[number]>) =>
  h("td").inner(...children);

export const Tr = (...cells: Array<Parameters<RNode["inner"]>[number]>) =>
  h("tr").inner(...cells);
