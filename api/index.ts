import express from "express";
import dotenv from "dotenv";
import { initDb } from "./shared/db.js";
import { registerApiRoutes } from "./shared/routes.js";

dotenv.config();

const app = express();

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use(async (_req, _res, next) => {
  await initDb();
  next();
});

registerApiRoutes(app);

export default app;
