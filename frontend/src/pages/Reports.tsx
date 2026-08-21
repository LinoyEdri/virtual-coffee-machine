import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";
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
  const monthName = MONTH_NAMES[now.getMonth()];

  function download(): void {
    /*
     * Navigating to the URL is the whole implementation.
     *
     * The response carries `Content-Disposition: attachment`, so the
     * browser downloads the file instead of navigating - this page stays
     * exactly where it is, and the user gets the native save dialog and
     * download progress for free.
     *
     * `assign()` rather than setting `location.href` directly: the two
     * are equivalent, but React's immutability lint rule reads the
     * assignment as mutating state defined outside the component.
     */
    window.location.assign(monthlyReportUrl(year, month));
  }

  return (
    <Row className="justify-content-center">
      <Col md={9} lg={7} xl={6}>
        <h1 className="mb-4">Reports</h1>

        <Card>
          <Card.Body>
            <Card.Title>
              {monthName} {year}
            </Card.Title>

            <Card.Text className="text-secondary">
              Download every order placed this month as an Excel spreadsheet.
              The file is generated on the server, so the raw order data is
              never exposed as JSON.
            </Card.Text>

            <div className="d-grid">
              <Button type="button" variant="dark" onClick={download}>
                Download monthly report
              </Button>
            </div>
          </Card.Body>

          <Card.Footer className="text-secondary">
            <small>
              Includes the order id, name, title, delay, status and timestamps.
            </small>
          </Card.Footer>
        </Card>
      </Col>
    </Row>
  );
}

export default Reports;
