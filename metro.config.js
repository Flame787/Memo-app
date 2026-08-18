// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// expo-sqlite's web implementation (wa-sqlite) ships a .wasm binary — Metro
// doesn't treat that extension as a static asset by default, so the web
// bundle fails to resolve it without this.
config.resolver.assetExts.push('wasm');

// wa-sqlite's web backend (OPFS) needs SharedArrayBuffer, which browsers
// only expose on cross-origin-isolated pages — these two headers opt the dev
// server into that. Dev-only: a real web deployment would need the same
// headers set by whatever hosts it (see Plan.md §12 if this ever matters for
// production, though this app targets Android, not web).
config.server.enhanceMiddleware = (middleware) => {
  return (req, res, next) => {
    res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    middleware(req, res, next);
  };
};

module.exports = config;
