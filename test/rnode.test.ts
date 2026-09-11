import { describe, expect, it, test } from "bun:test";
import { h, render } from "../src/rnode/rnode";
import { signal } from "../src/signal";

describe("RNode.inner — dynamic children", () => {
  it("renders a signal child and updates it in place", () => {
    const sig = signal("first");
    const node = h("div").inner(sig);
    expect(node.el.textContent).toBe("first");

    sig.set("second");
    expect(node.el.textContent).toBe("second");
    // anchor (comment) + one text node — no orphan accumulation
    expect(node.el.childNodes.length).toBe(2);
  });

  it("renders a getter child and re-runs it on dependency change", () => {
    const count = signal(0);
    const node = h("div").inner(() => `count=${count.get()}`);
    expect(node.el.textContent).toBe("count=0");
    count.set(1);
    expect(node.el.textContent).toBe("count=1");
  });

  it("keeps siblings intact when a signal child updates", () => {
    const sig = signal<string>("B");
    const node = h("div").inner("A", sig, h("b").inner("static"));

    sig.set("C");
    expect((node.el.childNodes[1] as Text).textContent).toBe("C");
    expect(node.el.childNodes[0].textContent).toBe("A");
    expect(node.el.childNodes[3].textContent).toBe("static");
  });

  it("switches between string and element children", () => {
    const sig = signal<any>("txt");
    const node = h("div").inner(sig);
    expect(node.el.textContent).toBe("txt");

    sig.set(h("i").inner("elem"));
    expect(node.el.textContent).toBe("elem");

    sig.set("back");
    expect(node.el.textContent).toBe("back");
    expect(node.el.children.length).toBe(0);
  });

  it("skips DOM writes for identical text", () => {
    const sig = signal("same");
    const node = h("div").inner(sig);
    const before = node.el.childNodes[0];
    sig.set("same");
    expect(node.el.childNodes[0]).toBe(before); // same text node reused
  });

  it("unmounts a removed RNode child", () => {
    const child = signal<any>(h("p").inner("here"));
    const node = h("div").inner(child);
    expect(node.el.querySelectorAll("p").length).toBe(1);
    child.set(undefined);
    expect(node.el.querySelectorAll("p").length).toBe(0);
  });
});

describe("RNode.inner — disposal", () => {
  it("does not accumulate effects when re-rendered", () => {
    const trigger = signal(0);
    const node = h("div").watch(trigger, (n) => {
      n.inner(() => `v${trigger.get()}`);
    });
    trigger.set(1);
    trigger.set(2);
    trigger.set(3);
    expect(node.el.textContent).toBe("v3");
    expect(node.el.childNodes.length).toBe(2); // anchor + text
    expect(node.childEffectCleanups.length).toBe(1);
  });

  it("keeps a re-passed child alive across re-renders", () => {
    const trigger = signal(0);
    const memoChild = h("em").inner("memoized");
    const node = h("div").watch(trigger, (n) => {
      n.inner(trigger.get() % 2 === 0 ? memoChild : "odd");
    });
    trigger.set(1); // odd -> string, memoChild detached
    trigger.set(2); // even -> memoChild re-inserted (same instance)
    expect(node.el.querySelector("em")?.textContent).toBe("memoized");
    expect(node.el.childNodes.length).toBe(1);
  });

  it("unmount() detaches the element and stops watching signals", () => {
    const s = signal(0);
    let calls = 0;
    const node = h("div").watch(s, () => calls++, false);
    document.body.appendChild(node.el);

    s.set(1);
    node.unmount();
    s.set(2);

    expect(calls).toBe(1);
    expect(document.body.contains(node.el)).toBe(false);
    expect(s.subscribers.size).toBe(0);
  });
});

describe("RNode.watch", () => {
  it("accepts an array of signals and re-runs on any of them", () => {
    const a = signal(1);
    const b = signal(2);
    let last = 0;
    h("div").watch([a, b], () => (last = a.get() + b.get()), false);
    a.set(10);
    expect(last).toBe(12);
    b.set(20);
    expect(last).toBe(30);
  });
});

describe("RNode.setInterval", () => {
  it("clears the interval on unmount", async () => {
    const node = h("div");
    let calls = 0;
    node.setInterval(() => calls++, 10);
    await Bun.sleep(35);
    const before = calls;
    node.unmount();
    await Bun.sleep(40);
    expect(calls).toBe(before); // no more calls after unmount
  });
});

describe("RNode.memo", () => {
  it("reuses the same node for the same key", () => {
    let builds = 0;
    const node = h("div");
    const build = () => (builds++, h("p").inner("row"));

    const first = node.memo("k1", build);
    const second = node.memo("k1", build);
    expect(second).toBe(first);
    expect(builds).toBe(1); // only built once
  });

  it("drops the cache entry when the memoized node unmounts", () => {
    const node = h("div");
    const child = node.memo("k1", () => h("p"));
    child.unmount();
    const rebuilt = node.memo("k1", () => h("span"));
    expect(rebuilt.el.tagName).toBe("SPAN");
  });
});

describe("render", () => {
  it("replaces existing children of the root", () => {
    const root = document.createElement("div");
    root.innerHTML = "<span>old</span>";
    render(root, h("div").inner("new"));
    expect(root.querySelectorAll("span").length).toBe(0);
    expect(root.textContent).toBe("new");
  });

  it("throws on a missing root element", () => {
    expect(() => render(null, h("div"))).toThrow();
  });
});
