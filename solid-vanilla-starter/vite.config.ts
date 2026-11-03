import path from "path";
import { defineConfig, ViteDevServer } from "vite";
import express from "express";
import { configureRoutes } from "./src/server/routes";

const expressPlugin = () => ({
  name: "vite-plugin-express",
  configureServer(server: ViteDevServer) {
    const app = express();
    configureRoutes(app);
    server.middlewares.use(app);
  },
});

export default defineConfig({
  root: "src/client",
  server: {
    port: 5177,
    host: "0.0.0.0",
    allowedHosts: true,
    strictPort: true,
  },
  build: {
    // server bundle is built first into dist-server/server.js; the client
    // lands beside it as the static public/ folder of the deployable artifact.
    outDir: path.resolve(__dirname, "dist-server/public"),
    emptyOutDir: true,
  },
  plugins: [expressPlugin()],
});
