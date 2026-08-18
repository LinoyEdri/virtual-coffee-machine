import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Vite prints the URLs it binds to inside the container (port 5173).
 * Under Docker Compose the app is published on a different host port,
 * and a container cannot discover its own port mapping - so compose
 * passes it in as PUBLIC_URL and this plugin appends it to the banner.
 */
function hostUrlBanner(): Plugin {
  return {
    name: 'host-url-banner',
    apply: 'serve',
    configureServer(server) {
      const publicUrl = process.env.PUBLIC_URL
      if (!publicUrl) return

      // Wrap Vite's own URL printer so our line appears right below it
      const printUrls = server.printUrls.bind(server)
      server.printUrls = () => {
        printUrls()
        server.config.logger.info(
          `  \x1b[32m➜\x1b[39m  \x1b[1mDocker\x1b[22m:  \x1b[36m${publicUrl}\x1b[39m  \x1b[2m<-- open this one\x1b[22m`,
        )
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), hostUrlBanner()],
  server: {
    // Listen on 0.0.0.0 so the dev server is reachable from outside the container
    host: true,
    port: 5173,
    watch: {
      // Bind-mounted files on Windows/macOS do not emit inotify events
      // inside the container, so hot reload needs polling.
      usePolling: true,
    },
  },
})
