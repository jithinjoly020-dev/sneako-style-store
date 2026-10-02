<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- The cPanel static build (`bun run build:cpanel`, plain Vite) must not ship Node built-ins or server-only modules to the browser. TanStack Start's client runtime needs `node:async_hooks` — `vite.cpanel.config.ts` aliases it to `cpanel/shims/async-hooks.ts` and stubs `@/lib/paytm.server` / `@/integrations/supabase/client.server` to `cpanel/shims/empty.ts`. Why: a plain Vite client build otherwise externalizes Node built-ins into broken stubs and the page renders blank (`AsyncLocalStorage is not a constructor`).
- The build's `emptyOutDir: true` deletes `dist-cpanel/.htaccess` on every rebuild — always re-copy it before zipping the cPanel package. Why: without it, refreshing `/shop` etc. 404s on Apache.

- The cPanel SPA entry (`cpanel/spa-entry.tsx`) replaces the root `shellComponent` with a fragment wrapper. Why: the SSR shell renders `<html>/<body>` inside `#root`, nesting a second document that freezes the browser on the first keystroke.
- Checkout places orders and saves UPI references through database functions (`place_order`, `submit_upi_reference`, `order_payment_status`), not direct table writes or server functions. Why: customers cannot read the orders table, and the static cPanel copy has no server.
- On cPanel, SMB UPI auto-verify runs through PHP files in `cpanel/api/` (copied into `dist-cpanel/api/` with a generated `config.php` holding keys, never committed). They reach orders only via token-checked DB functions `gateway_order_info` / `gateway_mark_paid`. Why: cPanel has no Node server and no service-role key.
