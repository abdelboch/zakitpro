import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';

export default defineConfig({
  site: 'https://zakitpro.com',
  output: 'static',
  adapter: vercel({}),
  integrations: [
    mdx(),
    tailwind(),
    sitemap()
  ],
  build: {
    inlineStylesheets: 'auto'
  },
  prefetch: {
    defaultStrategy: 'viewport'
  }
});
