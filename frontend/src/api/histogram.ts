import { request } from "./client";
import type { HistogramData } from "../types/api";

/**
 * GET /api/histogram
 *
 * Returns all-time order counts per person, as the two parallel arrays
 * the chart consumes directly.
 */
export function getHistogram(): Promise<HistogramData> {
  return request<HistogramData>("/api/histogram");
}
