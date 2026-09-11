import { describe, expect, it, test } from "bun:test";
import { h } from "../src/rnode/rnode";

describe("on", () => {
  it("invokes the handler when the event fires", () => {
    const node = h("button");
    let clicks = 0;
    node.on("click", () => clicks++);
    node.el.click();
    node.el.click();
    expect(clicks).toBe(2);
  });
});
