import { defineConfig } from 'vite';
// assetsDir: the content-hashed JS/CSS bundles go to dist/bundle/ so that netlify.toml can give them an immutable
// cache; the game's own (non-hashed) data lives under dist/assets/ and gets a short cache.
export default defineConfig({ base: './', build: { target: 'es2022', assetsInlineLimit: 0, assetsDir: 'bundle' } });
