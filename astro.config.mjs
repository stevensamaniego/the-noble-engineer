// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://stevensamaniego.github.io',
  base: '/the-noble-engineer',
  vite: {
    plugins: [tailwindcss()]
  }
});