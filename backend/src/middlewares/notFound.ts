import type { Request, Response } from "express";

/**
 * Catches any request that matched no route.
 *
 * Registered after all routes but before the error handler, so an
 * unknown path returns a JSON 404 instead of Express's default HTML
 * error page - which would break a frontend expecting JSON.
 */
export function notFound(req: Request, res: Response): void {
  res.status(404).json({
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}
