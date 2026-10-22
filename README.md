# solid-vanilla

A [Bun workspace](https://bun.sh/docs/install/workspaces) monorepo containing **solid-vanilla**, a tiny (~200 lines) SolidJS-like reactive UI framework that manipulates the DOM directly — no virtual DOM, no JSX, no build-time compiler — plus the packages built around it. This is a toy example of how to write a reactive SPA library, However i find it pretty elegant in its simplicity and i use it for my own projects.

## Packages

| Package                 | Path                                               | What it is                                                                                                      |
| ----------------------- | -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `solid-vanilla`         | [`solid-vanilla-core`](./solid-vanilla-core)       | The framework itself: function-based DOM nodes, signals/watch reactivity, router. Bun tests in `src/rnode` etc. |
| `solid-vanilla-ui`      | [`solid-vanilla-ui`](./solid-vanilla-ui)           | Reusable UI components built on the framework (tables, inputs, auth, etc.)                                      |
| `solid-vanilla-server`  | [`solid-vanilla-server`](./solid-vanilla-server)   | Express-based server helper: typed API routes, YAML config, auth                                                |
| `solid-vanilla-starter` | [`solid-vanilla-starter`](./solid-vanilla-starter) | Starter app tying it all together: Vite client + Express API + typed client↔server bindings, Pico CSS           |

## Getting started

```bash
bun install          # installs everything at the root (single bun.lock)
bun run build        # prettier + tsc (+ vite build for the starter) in every package
bun run test         # runs bun test where tests exist (core)
bun run format       # prettier in every package
```

Run an individual package's scripts with `bun run --cwd <pkg> <script>`, e.g.:

```bash
bun run --cwd solid-vanilla-starter dev    # vite dev server on http://localhost:5177
bun run --cwd solid-vanilla-starter start  # serve dist + API on port 5177
bun run --cwd solid-vanilla-core test      # framework unit tests
```

## How the packages relate

- `starter` and `ui` depend on `solid-vanilla` (core) via `workspace:*`
- `starter` also depends on `ui` and `server` via `workspace:*`
- All inter-package imports use plain package names (e.g. `import { render } from "solid-vanilla"`), resolved through workspace symlinks

## Notes

- Bun is the package manager and script runtime; TypeScript end-to-end.
- `tsc` (run via `build`) is the type gate — keep it passing.
- See each package's `readme.md` (and `solid-vanilla-starter/AGENTS.md`) for details.
