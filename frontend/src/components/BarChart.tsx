import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
} from "chart.js";
import { Bar } from "react-chartjs-2";

/**
 * Wraps Chart.js so no page imports it directly. Swapping charting
 * library later would change this file and nothing else.
 *
 * Chart.js has been modular since v3: controllers, elements, scales and
 * plugins ship separately so a bundle only contains what it uses. The
 * pieces have to be REGISTERED or the chart fails at runtime with
 * something like `"category" is not a registered scale`, which reads
 * like a library bug rather than a missing line.
 *
 *   BarElement    draws the rectangles
 *   CategoryScale the X axis - discrete categories (names)
 *   LinearScale   the Y axis - continuous numbers (counts)
 *   Tooltip       the hover popup
 *   Legend        the series key
 *
 * Registered at module level, so it happens once rather than on every
 * render.
 */
ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

interface BarChartProps {
  /** X axis - who ordered. */
  labels: string[];
  /** Y axis - how many. Positionally matched to `labels`. */
  data: number[];
  /** Series name, shown in the legend and tooltips. */
  seriesLabel?: string;
}

/**
 * The two arrays are passed straight through: `labels[i]` describes
 * `data[i]`, which is exactly the shape requirement 4.1.6 specifies the
 * API must return. No reshaping is needed.
 */
function BarChart({ labels, data, seriesLabel = "Orders" }: BarChartProps) {
  return (
    <Bar
      data={{
        labels,
        // An ARRAY because a chart can show several series at once.
        // This one has a single series.
        datasets: [{ label: seriesLabel, data }],
      }}
      options={{
        responsive: true,
        // Lets the surrounding element decide the height instead of the
        // chart forcing its own aspect ratio.
        maintainAspectRatio: false,
        scales: {
          y: {
            // Without this the axis can start above zero, which
            // visually exaggerates small differences.
            beginAtZero: true,
            // Order counts are whole numbers. With a maximum of 3,
            // Chart.js would otherwise label ticks 0.5, 1, 1.5 - and
            // nobody ordered half a coffee.
            ticks: { precision: 0 },
          },
        },
      }}
    />
  );
}

export default BarChart;
