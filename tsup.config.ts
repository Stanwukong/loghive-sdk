// tsup.config.ts

import { defineConfig } from "tsup";

export default defineConfig({
  // Entry points
  entry: ["src/index.ts"],

  // Output formats: CommonJS and ESM
  format: ["cjs", "esm"],

  // Output directories
  outDir: "dist",

  // Generate TypeScript declaration files
  dts: true,

  // Generate source maps for debugging
  sourcemap: true,

  // Clean output directory before build
  clean: true,

  // Minify output (optional, can enable for production)
  minify: false,

  // Split output into chunks (better for tree-shaking)
  splitting: true,

  // Tree-shakeable ESM exports
  treeshake: true,

  // Target environment
  target: "es2020",

  // Platform
  platform: "neutral", // Works in both browser and Node.js

  // External dependencies (don't bundle)
  external: ["axios", "dotenv", "rrweb", "@rrweb/types"],

  // Bundle size analysis (optional)
  metafile: true,

  // TypeScript config
  tsconfig: "./tsconfig.json",

  // Output file naming
  outExtension({ format }) {
    if (format === "cjs") {
      return { js: ".cjs" };
    }
    if (format === "esm") {
      return { js: ".mjs" };
    }
    return { js: ".js" };
  },

  // Environment-specific settings
  env: {
    NODE_ENV: process.env.NODE_ENV || "production",
  },

  // Skip node_modules
  skipNodeModulesBundle: true,

  // Preserve directory structure
  shims: false,

  // Code splitting for better tree-shaking
  esbuildOptions(options) {
    options.chunkNames = "chunks/[name]-[hash]";
  },
});
