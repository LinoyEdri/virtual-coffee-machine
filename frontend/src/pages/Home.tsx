import { Link } from "react-router-dom";

/**
 * The landing page (requirement 4.2.2).
 *
 * Navigation uses <Link> rather than <a href>. A plain anchor triggers a
 * full page reload: the browser discards the React app, re-downloads
 * everything and rebuilds from scratch. Link intercepts the click and
 * swaps the route in place, which is the whole point of a single-page
 * app. The difference is visible in the Network tab - with Link,
 * navigating makes no requests at all.
 *
 * TODO (stage 10 - design): 4.2.2 also asks for "an image / representative
 * design of a coffee machine" on this page. Deliberately deferred until
 * the design pass, since this is the one page whose entire purpose is
 * visual.
 */
function Home() {
  return (
    <div>
      <h1>Virtual Coffee Machine</h1>

      <p>
        Order a coffee and it joins a queue to be prepared. Boss orders jump
        ahead of everyone else, and an order can be scheduled to start brewing
        later.
      </p>

      <h2>Where to go</h2>

      {/*
        Each link carries a short description. The navbar above already
        provides bare links to the same places, so repeating them without
        explanation would add nothing.
      */}
      <ul>
        <li>
          <Link to="/order">Order</Link> — place a new coffee order
        </li>
        <li>
          <Link to="/reports">Reports</Link> — export this month&apos;s orders
          as an Excel file
        </li>
        <li>
          <Link to="/histogram">Histogram</Link> — see how many orders each
          person has placed
        </li>
      </ul>
    </div>
  );
}

export default Home;
