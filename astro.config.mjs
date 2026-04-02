import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';

export default defineConfig({
  site: 'https://www.zakitpro.com',
  output: 'static',
  adapter: vercel({}),
  security: {
    checkOrigin: false,
  },
  redirects: {
    '/blog/ai-generated-microsoft-graph-queries-2026': '/ai/ai-generated-microsoft-graph-queries-2026/',
    '/blog/ai-powered-powershell-2026': '/ai/ai-powered-powershell-2026/',
    '/ai-powered-powershell-2026': '/ai/ai-powered-powershell-2026/',
    '/ai-powered-intune-error-resolution-2026': '/ai/ai-powered-intune-error-resolution-2026/'
  },
  integrations: [
    mdx(),
    tailwind(),
    sitemap()
  ],
  build: {
    inlineStylesheets: 'auto'
  },
  vite: {
    build: {
      rollupOptions: {
        external: ['/pagefind/pagefind.js']
      }
    }
  },
  prefetch: {
    defaultStrategy: 'viewport'
  }
});
