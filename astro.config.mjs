// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  site: 'https://joemihavel.com',
  // Every page stays prerendered; only the handful of routes that opt out with
  // `export const prerender = false` run on the Worker. Static assets are free
  // and unlimited on Workers, so the request meter only ever sees the API.
  output: 'static',
  adapter: cloudflare({ imageService: 'passthrough' }),
  vite: {
    plugins: [tailwindcss()]
  }
});