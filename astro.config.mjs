import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  output: 'static',
  build: {
    format: 'file',
  },
  site: 'https://grithos.com',
  integrations: [sitemap()],
});
