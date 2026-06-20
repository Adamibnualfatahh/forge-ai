import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import Redis from "ioredis";

import { initDb } from "./api/shared/db.js";
import { registerApiRoutes } from "./api/shared/routes.js";

dotenv.config();

const app = express();
const PORT = 3000;

// Redis cache
let redis: Redis | null = null;
function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(process.env.REDIS_URL || "", { maxRetriesPerRequest: 2, lazyConnect: true });
    redis.connect().catch(e => console.warn("Redis connection failed, running without cache:", e.message));
  }
  return redis;
}

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

initDb();

registerApiRoutes(app, getRedis());

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
