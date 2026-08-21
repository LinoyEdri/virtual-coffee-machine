import { ApiError } from "../errors/ApiError";
import type { ErrorBody } from "../errors/ApiError";

/**
 * The single place this app talks to the backend.
 *
 * Every API module goes through `request` rather than calling fetch
 * directly, so the base URL, the JSON handling and - most importantly -
 * the error translation live in one file.
 */

/**
 * Exported so the reports module can build a download URL from it,
 * rather than reading the environment variable a second time.
 */
export const BASE_URL = import.meta.env.VITE_API_URL;

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...init,
      // Spread AFTER init, so a caller cannot accidentally drop the
      // content type by passing its own headers object.
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch {
    // fetch only rejects when the request never completed - the server is
    // down, DNS failed, the network is gone. An HTTP 500 is a *resolved*
    // promise, so it is handled below, not here.
    throw new ApiError(0, "Cannot reach the server. Is the backend running?");
  }

  if (!response.ok) {
    let body: ErrorBody = {};

    try {
      body = (await response.json()) as ErrorBody;
    } catch {
      // Not every failure returns JSON - a proxy error page, for example.
      // Falling through leaves body empty and the message below applies.
    }

    throw new ApiError(
      response.status,
      body.message ?? `Request failed with status ${String(response.status)}`,
      body.errors ?? [],
    );
  }

  return (await response.json()) as T;
}
