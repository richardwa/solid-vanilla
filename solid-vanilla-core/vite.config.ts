import { defineConfig } from "vite";

// Library-mode build: bundle src/index.ts into a single ESM file in dist/.
// The bundle is referenced directly by other projects via package.json
// exports; declarations are emitted separately by tsc (see
// tsconfig.declarations.json).
export default defineConfig({
  build: {
    lib: {
      entry: "src/index.ts",
      formats: ["es"],
    },
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: true,
    target: "es2020",
    minify: false,
  },
});
