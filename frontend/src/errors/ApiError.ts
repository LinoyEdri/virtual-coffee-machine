
/**
 * An error carrying the HTTP status and, for a 400, the per-field
 * details the backend sent.
 *
 * This mirrors AppError on the server: the layer that knows about HTTP
 * produces it, and the UI decides how to display it without ever having
 * to parse a Response itself.
 */
export class ApiError extends Error {
  public readonly status: number;
  public readonly fieldErrors: ApiFieldError[];

  constructor(
    status: number,
    message: string,
    fieldErrors: ApiFieldError[] = [],
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

/** One entry from a 400 response, identifying which field was invalid. */
export interface ApiFieldError {
  field: string;
  message: string;
}

/** The shape the backend's error handler returns. */
export interface ErrorBody {
  message?: string;
  errors?: ApiFieldError[];
}
