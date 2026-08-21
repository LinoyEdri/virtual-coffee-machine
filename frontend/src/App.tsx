import { BrowserRouter, Routes, Route } from "react-router-dom";
import Container from "react-bootstrap/Container";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Order from "./pages/Order";
import Reports from "./pages/Reports";
import Histogram from "./pages/Histogram";

/**
 * Application shell: a fixed navbar, the routed page, and a footer.
 *
 * The layout is three Bootstrap utility classes rather than any CSS of
 * our own:
 *   d-flex flex-column min-vh-100   makes the page at least a full screen
 *   flex-grow-1                     lets the main area absorb the slack
 *   mt-auto                         pushes the footer to the bottom
 *
 * Without those, a short page like Reports would leave the footer
 * floating halfway up the screen.
 */
function App() {
  return (
    <BrowserRouter>
      <div className="d-flex flex-column min-vh-100 bg-body-tertiary">
        <Navbar />

        <Container as="main" className="flex-grow-1 py-4">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/order" element={<Order />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/histogram" element={<Histogram />} />
          </Routes>
        </Container>

        <footer className="mt-auto border-top bg-white py-3">
          <Container>
            <small className="text-secondary">
              Virtual Coffee Machine — orders are queued and prepared in the
              background.
            </small>
          </Container>
        </footer>
      </div>
    </BrowserRouter>
  );
}

export default App;
