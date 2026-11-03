# Starter template

## Features
- solid vanilla framework
- client server bindings via typescript
- vite-express-plugin for seamless dev environment

### Build artifacts
`bun run build` produces the Vite client in `dist/` and a standalone server
bundle in `dist-server/server.js` (all dependencies inlined, no `node_modules`
required). The server reads the client from `dist/` next to it, so deploy those
two paths together and start with `bun dist-server/server.js` (or plain `node`).

### Client-Server bindings
just add to interface, and implement server side.  client shares types using fetchJson
```ts
// interface
export type ServerApi = {
  gitBranches: () => Promise<string[]>;
  gitLogs: (branch: string, lines?: number) => Promise<GitLog[]>;
};

// server
const serverImpl: ServerApi = {
    gitBranches: () => ...,
    gitLogs: () => ...,
};

// client
import { fetchJson } from "../common/interface";
const logs = await fetchJson("gitLogs", branch, maxLines.get()); // input and return value are typed!

```
