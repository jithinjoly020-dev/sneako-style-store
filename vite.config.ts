// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Public (browser-safe) backend address and publishable key. Used as a fallback so a hosted
// build that is made without its environment settings still connects instead of going blank.
const PUBLIC_BACKEND_URL = process.env['VITE_SUPABASE_URL'] || "https://jsabtikwuaismnmuhxsu.supabase.co";
const PUBLIC_BACKEND_KEY = process.env['VITE_SUPABASE_PUBLISHABLE_KEY'] || "sb_publishable_xpmxxNqgBUyUV4i0CpjxwA_TtFSeVWV";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    define: {
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(PUBLIC_BACKEND_URL),
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(PUBLIC_BACKEND_KEY),
    },
  },
});
