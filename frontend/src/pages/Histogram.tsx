import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
import BarChart from "../components/BarChart";
import Message from "../components/Message";
import { useHistogram } from "../hooks/useHistogram";

/**
 * The histogram page (requirement 4.2.2).
 *
 * X axis: names of the people who ordered. Y axis: how many orders each
 * placed. Plus the refresh button that reloads the data from the server.
 *
 * All the fetching lives in useHistogram; this component decides what to
 * show for each of the four states it can be in.
 */
function Histogram() {
  const { labels, data, loading, error, refresh } = useHistogram();

  /**
   * Order matters here. `error` is checked BEFORE the empty case,
   * because labels is [] in both situations - and telling someone
   * "no orders yet" when the request actually failed would be a lie.
   */
  function renderChart() {
    if (loading) {
      // Plain text rather than a Spinner: a spinner is an animation.
      return (
        <p className="text-center text-secondary py-5 mb-0">Loading...</p>
      );
    }

    if (error) {
      return <Message type="error">{error}</Message>;
    }

    if (labels.length === 0) {
      return (
        <p className="text-center text-secondary py-5 mb-0">
          No orders yet. Place one and it will appear here.
        </p>
      );
    }

    return (
      // The chart is configured with maintainAspectRatio: false, which
      // hands sizing to its container. Without an explicit height the
      // canvas collapses to nothing. An inline style rather than CSS,
      // because this is layout the chart REQUIRES to work, not styling.
      <div style={{ height: 360 }}>
        <BarChart labels={labels} data={data} />
      </div>
    );
  }

  return (
    <>
      <h1 className="mb-4">Histogram</h1>

      <Card>
        <Card.Header className="d-flex justify-content-between align-items-center">
          <span className="text-secondary">Orders per person</span>

          {/*
            type="button" is deliberate: inside a <form> a button
            defaults to type="submit". There is no form here, but relying
            on that is how stray submissions happen later.
          */}
          <Button
            type="button"
            variant="outline-dark"
            size="sm"
            onClick={refresh}
            disabled={loading}
          >
            {loading ? "Refreshing..." : "Refresh"}
          </Button>
        </Card.Header>

        <Card.Body>{renderChart()}</Card.Body>
      </Card>
    </>
  );
}

export default Histogram;
