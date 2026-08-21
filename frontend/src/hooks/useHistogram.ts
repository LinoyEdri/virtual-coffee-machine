import { useCallback, useEffect, useState } from "react";
import { getHistogram } from "../api/histogram";
import { ApiError } from "../errors/ApiError";

/**
 * Loads the order counts per person, and exposes a way to reload them.
 *
 * The refresh button required by 4.2.2 is just `refresh` below - the
 * page never touches the API itself.
 */
export function useHistogram() {
  const [labels, setLabels] = useState<string[]>([]);
  const [data, setData] = useState<number[]>([]);
  // Starts true: the first load begins immediately, so the very first
  // render is already a loading state.
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /**
   * Fetches and stores the result.
   *
   * Written as a promise chain rather than async/await on purpose. Every
   * state update happens inside a .then/.catch/.finally CALLBACK, which
   * is what React's rules allow from an effect. An async function would
   * put the same updates in its own body, and calling it from an effect
   * is flagged as a cascading render even though the awaits make it
   * asynchronous - the linter cannot see through them.
   *
   * useCallback keeps the identity stable, so the effect below does not
   * re-run - and re-fetch - on every render.
   */
  const load = useCallback(
    (): Promise<void> =>
      getHistogram()
        .then((histogram) => {
          setLabels(histogram.labels);
          setData(histogram.data);
          // Cleared on success, so a retry after a failure removes the
          // old message instead of leaving it on screen.
          setError("");
        })
        .catch((caught: unknown) => {
          setError(
            caught instanceof ApiError
              ? caught.message
              : "Could not load the histogram.",
          );
        })
        .finally(() => {
          // `finally` so loading clears on both paths. In `then` alone,
          // a failed load would spin forever.
          setLoading(false);
        }),
    [],
  );

  /** Runs once on mount. */
  useEffect(() => {
    void load();
  }, [load]);

  /**
   * The refresh button (4.2.2). Unlike the initial load this sets
   * loading up front - it runs from a click handler rather than an
   * effect, and without it a refresh would give no visible feedback.
   */
  const refresh = useCallback((): void => {
    setLoading(true);
    void load();
  }, [load]);

  return { labels, data, loading, error, refresh };
}
