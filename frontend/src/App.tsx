import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Order from "./pages/Order";
import Reports from "./pages/Reports";
import Histogram from "./pages/Histogram";

function App() {
  return (
    <BrowserRouter>
      <Navbar />

      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/order" element={<Order />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/histogram" element={<Histogram />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}

export default App;
