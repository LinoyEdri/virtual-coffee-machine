import { NavLink } from "react-router-dom";

function Navbar() {
  return (
    <nav>
      <NavLink to="/">Home</NavLink>{" "}
      <NavLink to="/order">Order</NavLink>{" "}
      <NavLink to="/reports">Reports</NavLink>{" "}
      <NavLink to="/histogram">Histogram</NavLink>
    </nav>
  );
}

export default Navbar;
