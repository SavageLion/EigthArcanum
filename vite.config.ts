import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // relative paths so the build works on itch.io, subfolders and Capacitor
  build: { target: 'es2020', assetsInlineLimit: 0 },
});
