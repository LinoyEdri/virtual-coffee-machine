import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "../errors/AppError";

/**
 * Global error handler - the single place errors become HTTP responses.
 *
 * Registered LAST in app.ts, because Express passes an error down the
 * middleware chain until it finds a handler with FOUR parameters.
 *
 * That four-parameter signature is how Express recognises error
 * middleware: with three parameters this would be treated as ordinary
 * middleware and never called for errors. `next` is unused here, but it
 * must stay in the list.
 */
export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction,
): void {
  // Invalid request body or query string (requirement 4.1.2).
  // `error.issues` is Zod's list of everything that failed - the client
  // gets ALL the problems at once rather than one per round trip.
  if (error instanceof ZodError) {
    res.status(400).json({
      message: "Validation failed",
      errors: error.issues.map((issue) => ({
        field: issue.path.join(".") || "(body)",
        message: issue.message,
      })),
    });
    return;
  }

  // Anything a service threw deliberately: it already knows its status.
  // instanceof matches AppError and all of its subclasses.
  if (error instanceof AppError) {
    res.status(error.statusCode).json({ message: error.message });
    return;
  }

  // Unexpected: log everything, tell the client nothing. Forwarding a
  // database error message to the browser is information disclosure.
  console.error(`Unhandled error on ${req.method} ${req.originalUrl}:`, error);

  res.status(500).json({ message: "Internal server error" });
}
