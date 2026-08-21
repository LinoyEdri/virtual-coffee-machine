/// <reference types="vite/client" />

/**
 * Types the environment variables this app reads.
 *
 * Vite exposes variables prefixed with VITE_ on `import.meta.env`, but
 * without this declaration they are typed `any` - so a typo like
 * VITE_API_URI would compile happily and be `undefined` at runtime.
 *
 * VITE_API_URL is injected by docker-compose.yml. It must be a
 * host-reachable URL, because this code runs in the browser: the browser
 * cannot resolve Docker service names such as `backend`.
 */
interface ImportMetaEnv {
  readonly VITE_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
