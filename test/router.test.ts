import { describe, expect, it, test } from "bun:test";
import { HashRouter, Router } from "../src/router";
import { h, type BaseNode } from "../src/rnode/rnode";

const stubRoot = () => h("div");

describe("Router", () => {
  it("matches routes with params and passes them to the component", () => {
    const router = new Router(stubRoot());
    let received: Record<string, string> | undefined;
    router.addRoute("/user/:id", (params) => {
      received = params;
      return h("span");
    });

    // exercise the matcher through a same-origin navigation
    history.replaceState({}, "", "http://localhost/user/42");
    (router as any).render();

    expect(received).toEqual({ id: "42" });
  });

  it("renders the first matching route", () => {
    const router = new Router(stubRoot());
    router.addRoute("/", () => h("b").inner("home"));
    router.addRoute("/about", () => h("b").inner("about"));

    history.replaceState({}, "", "http://localhost/about");
    (router as any).render();

    expect((router as any).root.el.textContent).toBe("about");
  });

  it("renders a fallback for unknown routes", () => {
    const router = new Router(stubRoot());
    router.addRoute("/", () => h("b").inner("home"));

    history.replaceState({}, "", "http://localhost/nope");
    (router as any).render();

    expect((router as any).root.el.textContent).toBe("Page Not Found");
  });

  it("navigate() updates the URL and re-renders", () => {
    const router = new Router(stubRoot());
    router.addRoute("/things", () => h("b").inner("things"));
    router.navigate("/things");
    expect(window.location.pathname).toBe("/things");
    expect((router as any).root.el.textContent).toBe("things");
  });

  it("route params must not span slashes", () => {
    const router = new Router(stubRoot());
    router.addRoute("/user/:id", () => h("span"));

    history.replaceState({}, "", "http://localhost/user/a/b");
    (router as any).render();

    // /user/:id should not match a two-segment tail
    expect((router as any).root.el.textContent).toBe("Page Not Found");
  });
});

describe("HashRouter", () => {
  it("navigates via the URL hash and renders the matched route", () => {
    const router = new HashRouter(stubRoot());
    router.addRoute("/settings", () => h("b").inner("settings"));

    router.navigate("/settings");
    expect(window.location.hash).toBe("#/settings");
    expect((router as any).root.el.textContent).toBe("settings");
  });

  it("defaults to / when the hash is empty", () => {
    const router = new HashRouter(stubRoot());
    router.addRoute("/", () => h("b").inner("root"));

    router.navigate("/");
    expect((router as any).root.el.textContent).toBe("root");
  });
});
