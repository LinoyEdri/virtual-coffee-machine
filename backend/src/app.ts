import express from "express";
import cors from "cors";

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

app.get("/health", (_req, res) => {
  res.json({
    success: true,
    message: "Coffee Machine Backend is running",
  });
});

export default app;
