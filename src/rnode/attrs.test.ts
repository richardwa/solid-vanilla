import { describe, expect, it, test } from "bun:test";
import { h } from "./rnode";
import { signal } from "../signal";

describe("attr", () => {
  it("updates the attribute when a signal changes", () => {
    const width = signal("10px");
    const node = h("div").attr("data-w", width);
    expect(node.el.getAttribute("data-w")).toBe("10px");
    width.set("20px");
    expect(node.el.getAttribute("data-w")).toBe("20px");
  });

  it("updates the attribute when a getter's dependency changes", () => {
    const open = signal(false);
    const node = h("details").attr("open", () => (open.get() ? "open" : null));
    expect(node.el.getAttribute("open")).toBeNull();
    open.set(true);
    expect(node.el.getAttribute("open")).toBe("open");
    open.set(false);
    expect(node.el.getAttribute("open")).toBeNull();
  });

  it("removes all attributes when key is null", () => {
    const node = h("div").attr("a", "1").attr("b", "2");
    node.attr(null as any);
    expect(node.el.attributes.length).toBe(0);
  });
});

describe("cn", () => {
  it("adds and removes the class when a signal changes", () => {
    const active = signal(true);
    const node = h("div").cn(
      () => (active.get() ? "is-active" : "is-idle"),
      true,
    );
    expect(node.el.classList.contains("is-active")).toBe(true);

    active.set(false);
    expect(node.el.classList.contains("is-active")).toBe(false);
    expect(node.el.classList.contains("is-idle")).toBe(true);
  });

  it("removes the class when add=false", () => {
    const node = h("div").cn("flag", true).cn("flag", false);
    expect(node.el.classList.contains("flag")).toBe(false);
  });
});

describe("css", () => {
  it("updates the style when a signal changes", () => {
    const color = signal("red");
    const node = h("div").css("color", color);
    expect(node.el.style.color).toBe("red");
    color.set("blue");
    expect(node.el.style.color).toBe("blue");
  });

  it("reacts through getters", () => {
    const gap = signal(4);
    const node = h("div").css("gap", () => `${gap.get()}px`);
    gap.set(8);
    expect(node.el.style.gap).toBe("8px");
  });
});
