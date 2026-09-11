import { describe, expect, it, test } from "bun:test";
import { getValue, signal } from "./signal";

describe("Signal", () => {
  it("notifies subscribers on change", () => {
    const s = signal("a");
    let seen: string | undefined;
    s.on(() => (seen = s.get()));
    s.set("b");
    expect(seen).toBe("b");
  });

  it("does not trigger subscribers when the value is identical", () => {
    const s = signal(1);
    let calls = 0;
    s.on(() => calls++);
    s.set(1);
    expect(calls).toBe(0);
    expect(s.get()).toBe(1);
  });

  it("forceTrigger triggers even when the value is identical", () => {
    const s = signal(1);
    let calls = 0;
    s.on(() => calls++);
    s.set(1, true);
    expect(calls).toBe(1);
  });

  it("on() with now=true runs the subscriber immediately", () => {
    const s = signal(7);
    let seen = 0;
    s.on(() => (seen = s.get()), true);
    expect(seen).toBe(7);
  });

  it("on() returns an unsubscribe function", () => {
    const s = signal(0);
    let calls = 0;
    const off = s.on(() => calls++);
    off();
    s.set(1);
    s.set(2);
    expect(calls).toBe(0);
  });
});

describe("getValue", () => {
  it("unwraps signals and getters", () => {
    expect(getValue(signal("x"))).toBe("x");
    expect(getValue(() => 42)).toBe(42);
  });
});

describe("persistAs", () => {
  it("loads an existing persisted value and persists updates", () => {
    localStorage.setItem("test-key-1", JSON.stringify({ a: 1 }));
    const s = signal<any>(null).persistAs("test-key-1");
    expect(s.get()).toEqual({ a: 1 });

    s.set([1, 2, 3]);
    expect(JSON.parse(localStorage.getItem("test-key-1")!)).toEqual([1, 2, 3]);
    localStorage.removeItem("test-key-1");
  });

  it("keeps the initial value when nothing is persisted", () => {
    const s = signal("fallback").persistAs("test-key-3");
    expect(s.get()).toBe("fallback");
    localStorage.removeItem("test-key-3");
  });
});
