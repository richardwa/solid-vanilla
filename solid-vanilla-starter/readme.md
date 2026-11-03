# Starter template

## Features
- solid vanilla framework
- client server bindings via typescript
- vite-express-plugin for seamless dev environment

### Build artifacts
`bun run build` builds the standalone server bundle first
(`dist-server/server.js`, all dependencies inlined, no `node_modules` required),
then Vite writes the client into `dist-server/public/`. The whole deployable
artifact is the `dist-server/` folder: deploy it as-is and start with
`bun dist-server/server.js` (or plain `node`).

For debugging you can also run the TypeScript entry directly with
`bun run start:src` (after a build). It finds the client via `$CLIENT_DIR`,
`./public` or `../../dist-server/public`, so source and bundle stay in sync.

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
