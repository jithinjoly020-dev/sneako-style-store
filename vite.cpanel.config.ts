// Static SPA build for cPanel / shared Apache hosting.
// Run: bun run build:cpanel   (outputs dist-cpanel/)
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { resolve } from "node:path";

export default defineConfig({
  root: resolve(process.cwd(), "cpanel"),
  publicDir: resolve(process.cwd(), "public"),
  envDir: process.cwd(),
  plugins: [react(), tailwindcss(), tsconfigPaths({ root: process.cwd() })],
  resolve: {
    alias: { "@": resolve(process.cwd(), "src") },
  },
  build: {
    outDir: resolve(process.cwd(), "dist-cpanel"),
    emptyOutDir: true,
  },
});
