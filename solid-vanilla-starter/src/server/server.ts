import express, { Request, Response } from "express";
import path from "path";
import { configureRoutes } from "./routes";

// Resolved at build time: tsup's `define` sets this to "public" for the
// bundle, while `bun run start:src` passes a source-relative path via
// `bun --define`. No runtime filesystem probing.
declare const __CLIENT_DIR__: string;

const app = express();
const port = process.env.PORT || 5177;

configureRoutes(app);

//   bundle: dist-server/server.js -> ./public
//   source: src/server/server.ts  -> ../../dist-server/public
const clientDir = path.resolve(__dirname, __CLIENT_DIR__);
app.use(express.static(clientDir));

// default to index.html for Router
app.use((req: Request, res: Response) => {
  res.sendFile(path.join(clientDir, "index.html"));
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
