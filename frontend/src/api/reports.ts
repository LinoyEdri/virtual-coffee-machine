import { BASE_URL } from "./client";

/**
 * Builds the download address for the monthly report.
 *
 * Deliberately does NOT call `request`. The report is a file download:
 * the Reports page points the browser at this URL, and the backend's
 * `Content-Disposition: attachment` header makes it save the file -
 * native save dialog, progress, everything.
 *
 * Fetching it instead would give us bytes in memory that we would then
 * have to wrap in a Blob, attach to a hidden link and click in code,
 * reimplementing what the browser already does. So this module's job is
 * to build an address, not to retrieve anything.
 */
export function monthlyReportUrl(year: number, month: number): string {
  return `${BASE_URL}/api/reports/monthly?year=${String(year)}&month=${String(month)}`;
}
