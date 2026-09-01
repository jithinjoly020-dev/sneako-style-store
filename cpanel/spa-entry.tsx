/**
 * Static SPA entry used only for the cPanel (shared hosting) build.
 * The Lovable-hosted app keeps using TanStack Start SSR; this file lets the
 * exact same routes run as a plain client-rendered bundle on Apache/cPanel.
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { getRouter } from "@/router";
import "@/styles.css";

const router = getRouter();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
