import { monthlyReportUrl } from "../api/reports";

/**
 * The reports page (requirement 4.2.2).
 *
 * The smallest page in the project, because the backend does all the
 * work: it builds the .xlsx and sends it with a Content-Disposition
 * header, so the browser saves the file rather than displaying it.
 *
 * There is no state, no loading flag and no custom hook here - nothing
 * is fetched. Not every page needs one.
 */

/** Month names for the label, so the button says what it will export. */
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function Reports() {
  const now = new Date();
  const year = now.getFullYear();
  // getMonth() is 0-based; the API expects 1-12.
  const month = now.getMonth() + 1;

  function download(): void {
    /*
     * Navigating to the URL is the whole implementation.
     *
     * The response carries `Content-Disposition: attachment`, so the
     * browser downloads the file instead of navigating - this page stays
     * exactly where it is, and the user gets the native save dialog and
     * download progress for free.
     *
     * Fetching it instead would mean holding the bytes in memory,
     * wrapping them in a Blob, creating an object URL, attaching it to a
     * hidden link, clicking that link in code and then revoking the URL -
     * reimplementing what the browser already does.
     *
     * `assign()` rather than setting `location.href` directly: the two
     * are equivalent, but React's immutability lint rule reads the
     * assignment as mutating state defined outside the component and
     * rejects it. A method call says the same thing without the
     * ambiguity.
     */
    window.location.assign(monthlyReportUrl(year, month));
  }

  return (
    <div>
      <h1>Reports</h1>

      <p>
        Export every order placed in {MONTH_NAMES[now.getMonth()]} {year} as an
        Excel file.
      </p>

      <button type="button" onClick={download}>
        Download monthly report
      </button>
    </div>
  );
}

export default Reports;
