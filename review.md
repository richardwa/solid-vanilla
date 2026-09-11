# Review: solid-vanilla

A ~525-line, SolidJS-inspired reactive DOM library (no virtual DOM, signals + fine-grained updates, memoization, SPA router, typed client↔server RPC). Reviewed all of `src/`.

## Overall verdict

Genuinely good as a learning artifact — the readme's claim that it's "easily comprehendable" holds up. The core loop (`Signal.get()` checks an observer stack → `createEffect` pushes a subscriber → `unmountListeners` cleanup) is a clean, real implementation of the same idea Solid uses. Inline-CSS components, `OptionalSignal` (`T | Signal<T> | (() => T)`) as a unified prop type, and the memo-tied-to-node pattern are nice ideas worth stealing. As a production framework, though, there are correctness bugs in the core `inner()` path and several sharp edges.

## What's done well

- **Dependency tracking is simple and correct-ish.** The `observers` stack in `signal.ts` is exactly how fine-grained libraries bootstrap reactivity. Auto-disposing via `unmountListeners` + `watch()` returning a cleanup handle is tidy.
- **Memory-conscious `inner()`:** removed children get `unmount()`'d recursively, and memo entries self-delete when unmounted (`rnode.ts:65-68`, `memo`'s `onUnmount` hook). That's more careful than many toy frameworks.
- **`OptionalSignal`/`getValue`** gives components a uniform way to accept static values, getters, or signals — same ergonomic win as Solid's props.
- **XSS-safe by construction** — everything goes through `createElement`/`textContent`/`setAttribute`, no innerHTML.
- **Typed RPC boundary** (`ServerApi` interface shared between client/server) is a pragmatic, zero-dependency alternative to tRPC for small apps.
- Sensible build hygiene: prettier on prebuild, `tsc` only, no runtime deps.

## Bugs

**1. `inner()` signal-replacement breaks with mixed string/element children.** `_innerResolveSignal` replaces by index into `this.el.children` (`rnode.ts:103-128`) — but `children` only counts *elements*, while string children become *text nodes*. `div().inner("a", sig(), "b")` computes wrong indices, and the special case `textContent = resolved` when `children.length <= 0` can clobber siblings. Index-based replacement is also order-fragile: if one signal child changes the element count, every other index goes stale.

**2. Stale effects accumulate when `inner()` is re-called.** Watch handlers like `watch(sig, node => node.inner(...sig.get()...))` create a *new* effect on every trigger. Old effects stay subscribed (they're only cleaned up on unmount) and keep calling `this.el.children[i].replaceWith(...)` — corrupting the DOM with orphaned children. This is the highest-severity issue because it's exactly the readme's advertised pattern.

**3. `on(null)` (listener wipe) corrupts the node graph.** `cloneNode(true)` + `replaceWith` (`rnode.ts:224-230`) detaches the element that `RNode.el` points at, and the clones' children lose all listeners *and* their RNode identity — subsequent `inner()`/`watch` updates write into detached nodes. Prefer `AbortController`: pass its `signal` to every `addEventListener` and `abort()` to remove listeners without cloning.

**4. Router param regex over-matches.** `:([^/]+)` → `(.*?)` means `/user/:id` matches `/user/a/b`. Should be `([^/]+)` in the generated regex.

**5. Small stuff:**
- `Signal.set` uses `===` — object/array signals always trigger (fine, but document it).
- `attr(key, undefined)` sets an *empty* attribute while `null` removes it — surprising; Solid treats both as "remove".
- `persistAs` will throw on malformed `localStorage` JSON (needs try/catch + version keys).
- `debug()`'s `import.meta.env.DEV` is a Vite-ism; under plain `tsc`/bun it's `undefined` — works by accident, hidden behind `@ts-ignore`.
- No `Link` component that intercepts clicks — every internal navigation either does a full page load or you must call `router.navigate()` manually, and `href()` in `base-components.ts` invites the former.
- `Router` misses query-string/`?search` support and 404 routes only render a bare string.

## Design concerns

- **`RNode.inner(...any[])`** throws away the carefully written `BaseNode` overloads — the most-typed API surface in the lib has an `any[]` escape hatch. Type it as the `ChildNode | OptionalSignal<ChildNode>` union.
- **No component/lifecycle story** beyond `do()` and `onUnmount`. It works because everything is one tree, but there's no `onMount`-after-insert or owner chain, so effects created *outside* `inner()` (e.g., in `attr` before insertion) are fine, but effects can't be created "outside" any node and attached later.
- **`memo` keys are caller-managed strings** — fine for the git-log demo, but easy to collide (`[branch, log.commitHash].join(" ")` — two fields joined with a space that could appear in a hash). Suggest `JSON.stringify` keys or a scoped map per `inner()` call.
- Router `render()` recreates the entire subtree on navigation (no outlet nesting, no route-transition hooks) — acceptable at this scope, worth stating in the readme.

## Suggestions (ordered)

1. Fix the stale-effect leak: when `inner()` is re-called, dispose effects created by the previous call (keep a `childEffects: Array<() => void>` alongside `childrenSet`).
2. Replace index-based child replacement with anchored text/comment placeholder nodes — this is exactly what Solid does and it eliminates bug #1 entirely.
3. Add `AbortController`-based listener teardown; delete the `on(null)` clone trick.
4. Fix the router regex to `([^/]+)` and add a `Link` component (`<a>` + `preventDefault` + `navigate`).
5. Type `inner()` properly and drop `@ts-ignore`s.

**Rating:** as a pedagogical project, 8/10 — it delivers on "understand how Solid works" better than most blog posts. As a framework, 5/10: solid core idea, but the dynamic-children path needs the fixes above before anything real builds on it.
