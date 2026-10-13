import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';
import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: cloudflare({
    imageService: 'cloudflare'
  }),
  integrations: [
    tailwind({
      applyBaseStyles: true
    }),
    react()
  ],
  vite: {
    ssr: {
      noExternal: ['lucide-react']
    }
  }
});
