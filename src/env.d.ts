/// <reference types="astro/client" />

// Deliberately no global reference to @cloudflare/workers-types: it redefines
// Response, ReadableStream and friends, which then shadow the DOM versions in
// every browser-side script. Server files import the types they need instead.

// The Workers runtime provides this module; there is no package to install.
declare module "cloudflare:workers" {
  export const env: Record<string, unknown>;
}
