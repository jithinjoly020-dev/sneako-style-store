/**
 * Static SPA entry used only for the cPanel (shared hosting) build.
 * The Lovable-hosted app keeps using TanStack Start SSR; this file lets the
 * exact same routes run as a plain client-rendered bundle on Apache/cPanel.
 */
import { StrictMode, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { HeadContent, RouterProvider } from "@tanstack/react-router";
import { getRouter } from "@/router";
import "@/styles.css";

const router = getRouter();

// The SSR shell renders <html>/<head>/<body>. Mounted inside #root that nests a
// second document, which locks up the browser on the first keystroke (seen on
// checkout). Swap it for a plain wrapper; React still hoists titles/meta.
function SpaShell({ children }: { children: ReactNode }) {
  return (
    <>
      <HeadContent />
      {children}
    </>
  );
}
(router.routeTree.options as { shellComponent?: unknown }).shellComponent = SpaShell;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
