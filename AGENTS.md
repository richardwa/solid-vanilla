# AGENTS.md — solid-vanilla (workspace root)

Guidance for coding agents working in this repository.

## What this is

A Bun workspace monorepo. Four packages live in subdirectories, each with its own `package.json`:

- **`solid-vanilla-core`** (`solid-vanilla`) — the reactive UI framework (~200 lines, no virtual DOM, no JSX). Unit tests live here (`bun test`).
- **`solid-vanilla-ui`** (`solid-vanilla-ui`) — reusable components on top of the framework.
- **`solid-vanilla-server`** (`solid-vanilla-server`) — Express-based API helper (typed routes, YAML, auth).
- **`solid-vanilla-starter`** — the demo/starter app (Vite client + Express server + typed client↔server bindings). See `solid-vanilla-starter/AGENTS.md` for package-specific rules.

## Workspace rules

- **Always install from the repo root**: `bun install`. There is a single root `bun.lock`; never run installs that would create per-package lockfiles, and never commit one.
- **Intra-workspace dependencies use `workspace:*`**, not relative paths or git URLs.
- **Scripts run from the root** via `bun run build`, `bun run test`, `bun run format` (these fan out with `bun run --filter '*'`). For a single package: `bun run --cwd <pkg> <script>`.
- **Shared TypeScript config**: packages use Bun + `tsc` typecheck (`build` script) as the gate — keep every package's build passing.
- **`node_modules/` and `dist/` are gitignored** everywhere (root `.gitignore` covers all packages).

## Conventions

- TypeScript ESM everywhere (`"type": "module"`).
- Files stay under ~300 lines; split by responsibility (render vs. data vs. helpers).
- Keep prettier-formatted (`bun run format` runs as `prebuild` in each package).
- Commits: concise, descriptive messages; commit only files you changed.

## Commands quick reference

```bash
bun install                      # root install (updates root bun.lock)
bun run build                    # typecheck/build all packages
bun run test                     # run tests (core)
bun run --cwd solid-vanilla-starter dev    # vite dev server, port 5177
bun run --cwd solid-vanilla-starter start  # serve dist + API, port 5177
```
