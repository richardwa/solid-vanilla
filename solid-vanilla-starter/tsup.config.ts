import { defineConfig } from "tsup";

// Bundle the Express server and every runtime dependency into one standalone
// ESM file (no node_modules needed). The client is the one external input: it
// is built separately by Vite into ./dist and served from disk at runtime, so
// an artifact is just dist-server/server.js + dist/.
export default defineConfig({
  entry: { server: "src/server/server.ts" },
  outDir: "dist-server",
  format: ["esm"],
  target: "es2022",
  platform: "node",
  sourcemap: true,
  clean: true,
  // shims __dirname/__filename for ESM (works on Bun and Node), used to
  // locate the Vite client dist/ next to the bundle.
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
