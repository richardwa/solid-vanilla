import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: false,
  clean: true,
  // 👈 Injects the correct value into the bundle depending on the script mode
  define: {
    "import.meta.env.DEV": JSON.stringify(process.env.NODE_ENV !== "production"),
  },
});
