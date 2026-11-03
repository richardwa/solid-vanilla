import { defineConfig } from "tsup";

// Bundle the Express server (plus the workspace packages it imports) into a
// single ESM file for `bun run start`. The client is bundled separately by
// Vite into ./dist; this output lives in ./dist-server so Vite's emptyOutDir
// never wipes it and the server bundle is not served as a static asset.
export default defineConfig({
  entry: { server: "src/server/server.ts" },
  outDir: "dist-server",
  format: ["esm"],
  target: "es2022",
  platform: "node",
  sourcemap: true,
  clean: true,
  // shims __dirname/__filename for ESM, used to locate the client dist/.
  shims: true,
  external: ["express"],
  noExternal: ["solid-vanilla-server"],
});
