// vite.config.js

import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills'


export default defineConfig({
  root: './',
  base: './', 
  
  // CRITICAL FIX: Tell Vite to treat these extensions as static assets
  assetsInclude: [
    '**/*.glb', 
    '**/*.gltf', 
    '**/*.hdr', 
    '**/*.m4a', 
    '**/*.mp3', 
    '**/*.wav',
    '**/*.wasm'
  ], 


  build: {
    assetsDir: 'assets',
    rollupOptions: {
      input: {
        main: 'index.html',
      },
    },
  },

  server: {
    open: 'index.html',
    mime: {
      'application/octet-stream': ['.glb', '.gltf'],
      'image/hdr': ['.hdr']
    }
  },
  
  // 1. STANDARD BABYLON/RECAST FIX
  resolve: {
    alias: [
      { find: 'recast', replacement: '' } 
    ]
  },

    plugins: [
    nodePolyfills({
      // Enable polyfills for specific Node.js globals
      globals: {
        Buffer: true, // Polyfills Node's global Buffer
        global: true,
        process: true,
      },
      // Polyfills standard node modules like stream, path, etc. if required
      protocolImports: true,
    }),
        // Custom middleware to ensure Vite serves .wasm files with the correct MIME type
    {
      name: 'wasm-content-type',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url.endsWith('.wasm')) {
            res.setHeader('Content-Type', 'application/wasm');
          }
          next();
        });
      },
    },
  ],
  
  // 2. CRITICAL FIX FOR DEV SERVER: EXCLUDE MODULAR DEPENDENCIES
  // This prevents Vite from pre-bundling the Babylon modules that rely on side-effects
  // (like the GLTF loader) or WASM files (like Havok).
  optimizeDeps: {
    // Exclude Babylon modules that must execute code to register loaders or features
    // or rely on a specific dependency structure (like havok.wasm).
    include: [
      '@babylonjs/core/Legacy/legacy',
    ],
    exclude: [
      // Exclude these so their side-effect code runs as expected
      '@babylonjs/core', 
      '@babylonjs/loaders/glTF',
      '@babylonjs/havok',
      '@shelby-protocol/sdk'

    ]
  }
});