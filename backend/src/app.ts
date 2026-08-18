import express from "express";
import cors from "cors";
import { isDatabaseReachable } from "./config/database";

/**
 * Builds and configures the Express application.
 *
 * This module deliberately does NOT call app.listen(). Keeping the app
 * separate from the HTTP server lets tests import it and issue requests
 * in-process (e.g. with Supertest) without binding a real port.
 */
const app = express();

// Allow the browser-side app (a different origin) to call this API
app.use(cors());

// Parse incoming JSON request bodies into req.body
app.use(express.json());

/**
 * Liveness + readiness probe.
 *
 * Returns 503 rather than 200 when the database is unreachable, so an
 * orchestrator (or docker-compose healthcheck) can tell "the process is
 * up" apart from "the service can actually do its job".
 */
app.get("/health", async (_req, res) => {
  const databaseConnected = await isDatabaseReachable();

  res.status(databaseConnected ? 200 : 503).json({
    success: databaseConnected,
    message: "Coffee Machine Backend is running",
    database: databaseConnected ? "connected" : "unreachable",
  });
});

export default app;
