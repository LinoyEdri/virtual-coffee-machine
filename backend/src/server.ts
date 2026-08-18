// Must be the first import so that process.env is populated
// before any other module reads from it.
import "dotenv/config";

import app from "./app";

// The port the process actually binds to. Under Docker this is the port
// INSIDE the container, which is not the port you use in the browser.
const PORT = Number(process.env.PORT) || 3000;

// A container cannot discover its own published host port, so
// docker-compose.yml passes it in. Falls back to the bound port when
// running directly on the host without Docker.
const PUBLIC_URL = process.env.PUBLIC_URL ?? `http://localhost:${PORT}`;

app.listen(PORT, () => {
  console.log("Coffee Machine backend is running");
  console.log(`  API          : ${PUBLIC_URL}`);
  console.log(`  Health check : ${PUBLIC_URL}/health`);
  console.log(`  Bound to port ${PORT} inside the container`);
});
