import express, { Request, Response } from "express";
import path from "path";
import { configureRoutes } from "./routes";

const app = express();
const port = process.env.PORT || 5177;

configureRoutes(app);

// Serve frontend from the Vite build next to the bundle
// (dist-server/server.js + dist-server/public)
const distPath = path.resolve(__dirname, "public");
app.use(express.static(distPath));

// default to index.html for Router
app.use((req: Request, res: Response) => {
  res.sendFile(path.join(distPath, "index.html"));
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
