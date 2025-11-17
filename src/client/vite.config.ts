import { defineConfig } from 'vite';

export default defineConfig({
  root:'src/client',
  server: {
    port: 5173,
    host: true,
    allowedHosts: true,
  }
});
