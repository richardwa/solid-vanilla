import path from 'path';
import { defineConfig, ViteDevServer } from 'vite';
import express, { Request, Response, NextFunction } from 'express';
import { routes } from './src/server/api-routes';
import { apiPath } from './src/common/interface'

const expressPlugin = () => ({
  name: 'vite-plugin-express',
  configureServer(server: ViteDevServer) {
    const app = express();

    // Example middleware
    const logger = (req: Request, res: Response, next: NextFunction) => {
      console.log(`[${req.method}] ${req.url}`);
      next();
    };

    app.use(logger);
    app.use(apiPath, routes);

    // Attach Express app to Vite dev server middleware stack
    server.middlewares.use(app);
  }
});

export default defineConfig({
  root: 'src/client',
  server: {
    port: 5177,
    host: true,
    allowedHosts: true,
    strictPort: true
  },
  build:{
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: true,
  },
  plugins: [expressPlugin()]
});
