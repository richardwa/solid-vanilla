import { defineConfig } from "tsup";

// Bundle the Express server and every runtime dependency into one standalone
// ESM file (no node_modules needed). Built first, then Vite writes the client
// into ./dist-server/public, so the whole deployable artifact is the
// self-contained ./dist-server folder.
export default defineConfig({
  entry: { server: "src/server/server.ts" },
  outDir: "dist-server",
  format: ["esm"],
  target: "es2022",
  platform: "node",
  sourcemap: true,
  clean: true,
  // shims __dirname/__filename for ESM (works on Bun and Node), used to
  // locate the Vite client in ./public next to the bundle.
  shims: true,
  // Express and its deps are CJS and call require() dynamically; restore a
  // real require for the ESM bundle so it also runs on plain Node.
  banner: {
    js: `import { createRequire } from "node:module"; const require = createRequire(import.meta.url);`,
  },
  // Inline dependencies (express, solid-vanilla-server, ...); node builtins
  // stay external automatically because platform is "node".
  noExternal: [/.*/],
});
