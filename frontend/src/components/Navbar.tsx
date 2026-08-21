import BsNavbar from "react-bootstrap/Navbar";
import Container from "react-bootstrap/Container";
import Nav from "react-bootstrap/Nav";
import { NavLink } from "react-router-dom";

/**
 * The fixed top navigation required by 4.2.3.
 *
 * `as={NavLink}` is the key line: Bootstrap supplies the appearance and
 * React Router supplies the behaviour. NavLink adds an `active` class to
 * whichever link matches the current route, and Bootstrap already styles
 * `.nav-link.active` - so the "visual marking of the active page" needs
 * no CSS and no JavaScript of ours.
 *
 * There is deliberately no Navbar.Toggle / Navbar.Collapse. Those bring
 * a collapse animation, and four short links fit comfortably on a phone
 * without one.
 */
function Navbar() {
  return (
    <BsNavbar bg="dark" data-bs-theme="dark">
      <Container>
        <BsNavbar.Brand
          as={NavLink}
          to="/"
          className="d-flex align-items-center gap-2"
        >
          {/*
            The same file the browser tab uses, from public/. Served at
            the site root, so it is referenced as an absolute path rather
            than imported - files in public/ are copied verbatim and are
            not processed by Vite.

            alt="" on purpose: the brand text beside it already says what
            this is, so giving the image its own label would make a
            screen reader announce the name twice.
          */}
          <img src="/coffee-icon.svg" alt="" width={28} height={28} />
          Virtual Coffee Machine
        </BsNavbar.Brand>

        <Nav className="ms-auto">
          {/*
            `end` matters on the home link. Without it NavLink treats "/"
            as a prefix of every route, so Home would look active on all
            four pages.
          */}
          <Nav.Link as={NavLink} to="/" end>
            Home
          </Nav.Link>
          <Nav.Link as={NavLink} to="/order">
            Order
          </Nav.Link>
          <Nav.Link as={NavLink} to="/reports">
            Reports
          </Nav.Link>
          <Nav.Link as={NavLink} to="/histogram">
            Histogram
          </Nav.Link>
        </Nav>
      </Container>
    </BsNavbar>
  );
}

export default Navbar;
