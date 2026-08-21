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
      return <p>Loading...</p>;
    }

    if (error) {
      return <Message type="error">{error}</Message>;
    }

    if (labels.length === 0) {
      return <p>No orders yet.</p>;
    }

    return (
      // The chart is configured with maintainAspectRatio: false, which
      // hands sizing to its container. Without an explicit height the
      // canvas collapses to nothing. An inline style rather than CSS,
      // because this is layout the chart REQUIRES to work, not styling.
      <div style={{ height: 320 }}>
        <BarChart labels={labels} data={data} />
      </div>
    );
  }

  return (
    <div>
      <h1>Histogram</h1>

      <p>Orders per person.</p>

      {/*
        type="button" is deliberate: inside a <form> a button defaults to
        type="submit". There is no form here, but relying on that is how
        stray submissions happen later.
      */}
      <button type="button" onClick={refresh} disabled={loading}>
        {loading ? "Loading..." : "Refresh"}
      </button>

      {renderChart()}
    </div>
  );
}

export default Histogram;
