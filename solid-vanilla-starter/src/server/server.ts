import express, { Request, Response } from "express";
import fs from "node:fs";
import path from "path";
import { configureRoutes } from "./routes";

const app = express();
const port = process.env.PORT || 5177;

configureRoutes(app);

// Locate the built client for both ways this entry is run:
//   bundle: dist-server/server.js        -> ./public
//   source: src/server/server.ts         -> ../../dist-server/public
// CLIENT_DIR overrides both (useful for deploys with a different layout).
const clientDir = [
  process.env.CLIENT_DIR && path.resolve(process.env.CLIENT_DIR),
  path.resolve(__dirname, "public"),
  path.resolve(__dirname, "../../dist-server/public"),
]
  .filter((dir): dir is string => Boolean(dir))
  .find((dir) => fs.existsSync(path.join(dir, "index.html")));

if (!clientDir) {
  throw new Error(
    "client build not found; run `bun run build` (or set CLIENT_DIR)",
  );
}

app.use(express.static(clientDir));

// default to index.html for Router
app.use((req: Request, res: Response) => {
  res.sendFile(path.join(clientDir, "index.html"));
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
