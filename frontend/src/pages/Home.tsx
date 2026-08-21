import { Link } from "react-router-dom";
import Card from "react-bootstrap/Card";
import Col from "react-bootstrap/Col";
import Image from "react-bootstrap/Image";
import Row from "react-bootstrap/Row";

/**
 * The landing page (requirement 4.2.2): a representative image of a
 * coffee machine, and clear navigation to the rest of the app.
 *
 * Navigation uses <Link> rather than <a href>. A plain anchor triggers a
 * full page reload - the browser discards the React app and rebuilds it
 * from scratch - while Link swaps the route in place.
 */

/**
 * ============================================================
 *  PASTE YOUR IMAGE URL HERE
 * ============================================================
 * A photo or illustration of a coffee machine, shown beside the
 * introduction. Landscape or square both work; it is displayed inside a
 * rounded, bordered frame and scales to the column width.
 *
 * Either a remote URL ("https://...") or a local file placed in
 * frontend/public and referenced as "/coffee-machine.jpg".
 *
 * Left empty, a labelled placeholder box is shown instead.
 */
const COFFEE_MACHINE_IMAGE = "/coffee-machine.jpg"; // <-- PASTE YOUR IMAGE URL HERE

/** The three destinations, so the cards below are one map instead of three blocks. */
const DESTINATIONS = [
  {
    to: "/order",
    title: "Order",
    text: "Place a coffee order. Choose who it is for and whether it should start brewing now or later.",
    action: "Order a coffee",
  },
  {
    to: "/reports",
    title: "Reports",
    text: "Download every order placed this month as an Excel file, generated on the server.",
    action: "Open reports",
  },
  {
    to: "/histogram",
    title: "Histogram",
    text: "See how many coffees each person has ordered, as a bar chart.",
    action: "View histogram",
  },
];

function Home() {
  return (
    <>
      {/* Hero: introduction on the left, image on the right. On narrow
          screens the columns stack, image last. */}
      <Row className="align-items-center g-4 mb-5">
        <Col md={7}>
          <h1 className="mb-3">Virtual Coffee Machine</h1>

          <p className="lead text-secondary mb-4">
            Order a coffee and it joins a queue to be prepared. Boss orders jump
            ahead of everyone else, and any order can be scheduled to start
            brewing later.
          </p>

          {/*
            A Link carrying Bootstrap's button classes, rather than
            <Button as={Link}>. Both render the same markup, but the
            polymorphic `as` form does not type cleanly against React
            Router's Link, and this keeps it a real anchor - so
            middle-click and "open in new tab" still work.
          */}
          <Link to={DESTINATIONS[0].to} className="btn btn-dark btn-lg">
            Order a coffee
          </Link>
        </Col>

        <Col md={5}>
          {COFFEE_MACHINE_IMAGE ? (
            <Image
              src={COFFEE_MACHINE_IMAGE}
              alt="A coffee machine"
              fluid
              rounded
              className="border"
            />
          ) : (
            // Placeholder until an image URL is supplied above.
            <div
              className="border rounded bg-white d-flex align-items-center justify-content-center text-secondary text-center p-4"
              style={{ minHeight: 240 }}
            >
              <span>
                Coffee machine image
                <br />
                <small>set COFFEE_MACHINE_IMAGE in Home.tsx</small>
              </span>
            </div>
          )}
        </Col>
      </Row>

      {/* One card per destination. h-100 keeps them equal height even
          when their descriptions differ in length. */}
      <Row className="g-4">
        {DESTINATIONS.map((destination) => (
          <Col md={4} key={destination.to}>
            <Card className="h-100">
              <Card.Body className="d-flex flex-column">
                <Card.Title>{destination.title}</Card.Title>
                <Card.Text className="text-secondary">
                  {destination.text}
                </Card.Text>

                {/* mt-auto pins the button to the bottom of every card,
                    so they line up across the row. */}
                <Link
                  to={destination.to}
                  className="btn btn-outline-dark mt-auto align-self-start"
                >
                  {destination.action}
                </Link>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
    </>
  );
}

export default Home;
