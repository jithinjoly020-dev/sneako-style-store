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
    alias: {
      "@": resolve(process.cwd(), "src"),
      // TanStack Start's client runtime needs a browser-safe AsyncLocalStorage.
      "node:async_hooks": resolve(process.cwd(), "cpanel/shims/async-hooks.ts"),
      // Server-only modules are dead code in the static build; stub them out so
      // no Node built-ins leak into the browser bundle.
      "@/lib/paytm.server": resolve(process.cwd(), "cpanel/shims/empty.ts"),
      "@/integrations/supabase/client.server": resolve(process.cwd(), "cpanel/shims/empty.ts"),
      "@/lib/smbupi.server": resolve(process.cwd(), "cpanel/shims/empty.ts"),
    },
  },
  define: { "import.meta.env.VITE_STATIC_HOST": JSON.stringify("1"), "import.meta.env[\"VITE_STATIC_HOST\"]": JSON.stringify("1") },
  build: {
    outDir: resolve(process.cwd(), "dist-cpanel"),
    emptyOutDir: true,
  },
});
