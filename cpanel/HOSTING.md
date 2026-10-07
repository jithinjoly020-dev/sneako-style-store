# Hosting Concrete on cPanel

The zip (`concrete-cpanel.zip`) is a fully built static site. Your shop, cart,
checkout, admin dashboard and login all still work, because the database, auth
and orders run on the managed cloud backend over HTTPS — cPanel only serves the
files.

## Upload steps

1. cPanel → **File Manager** → open `public_html` (or `public_html/yourdomain`
   for an addon domain).
2. Delete any old `index.html` / demo files.
3. Click **Upload** and pick `concrete-cpanel.zip`.
4. Back in File Manager, right-click the zip → **Extract** into that same folder.
5. Delete the zip afterwards.
6. Make sure `.htaccess` came across. In File Manager use **Settings → Show
   hidden files**. If it is missing, create a file named `.htaccess` and paste
   the contents of the `.htaccess` in this package. Without it, refreshing
   `/shop` or `/admin` returns a 404.
7. cPanel → **SSL/TLS Status** → **Run AutoSSL** so the site is served over
   HTTPS.

Visit your domain — the storefront should load. `/auth` logs in, `/admin` opens
the dashboard for admin accounts.

## Where the data lives

Products, orders, customers and admin logins stay in the managed cloud database.
cPanel's MySQL is not used and does not need to be set up. Anything you add in
`/admin` appears instantly on the live storefront.

## Rebuilding after changes

Whenever you change the site in Lovable, regenerate the package:

```sh
npm install
npm run build:cpanel     # outputs dist-cpanel/
```

Then upload the contents of `dist-cpanel/` (including `.htaccess`) to
`public_html` again, replacing the old files.

## Common issues

| Symptom | Fix |
| --- | --- |
| 404 when refreshing `/shop`, `/cart`, `/admin` | `.htaccess` missing or `mod_rewrite` disabled — re-upload it, or ask your host to enable rewrite. |
| Blank white page | Files were uploaded into a subfolder. `index.html` must sit directly in `public_html`. |
| Old version keeps showing | Clear browser cache / cPanel LiteSpeed cache; asset names are hashed so a hard refresh fixes it. |
| Products don't load | The site must be served over HTTPS; run AutoSSL. |

## Note on subfolders

This build assumes the site lives at the domain root (`https://example.com/`).
For a subfolder like `example.com/shop-site/`, set `base: "/shop-site/"` in
`vite.cpanel.config.ts`, change `RewriteBase` in `.htaccess` to match, and
rebuild.

## MySQL copy (phpMyAdmin)
1. cPanel > MySQL Databases: create a database and user, add the user with ALL privileges.
2. Fill `mysql_db`, `mysql_user`, `mysql_pass` in `public_html/api/config.php`.
3. cPanel > Cron Jobs, every minute: `curl -s https://frxsuper.store/api/sync.php >/dev/null`
4. Orders, items and products then appear in phpMyAdmin (tables are created automatically).
