/**
 * Application errors that carry an HTTP status code.
 *
 * Services throw these; they never touch `res`. The global error handler
 * middleware is the single place that turns them into HTTP responses.
 *
 * Anything thrown that is NOT an AppError is treated as an unexpected
 * bug: reported as 500, with its message hidden from the client.
 */
export class AppError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    // Passes the message up to the built-in Error constructor, which
    // sets `this.message` and captures the stack trace.
    super(message);

    // `new.target` is the constructor that was actually called with
    // `new`. So `new NotFoundError()` sets this to "NotFoundError", not
    // "AppError" - each subclass gets its own name in logs without
    // having to set it individually.
    this.name = new.target.name;

    this.statusCode = statusCode;
  }
}

/** 400 - the request was understood, but its contents are invalid. */
export class ValidationError extends AppError {
  constructor(message = "Validation failed") {
    super(message, 400);
  }
}

/** 401 - the boss password was missing or wrong (requirement 4.1.2). */
export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super(message, 401);
  }
}

/** 404 - no such order. */
export class NotFoundError extends AppError {
  constructor(message = "Not found") {
    super(message, 404);
  }
}
