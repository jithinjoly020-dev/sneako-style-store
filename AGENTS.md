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

