# Visual site editor for cPanel

## What will be added
- Add a **Site editor** entry in admin that works in both the Lovable-hosted app and the static cPanel version.
- Let an authenticated admin open Home, Shop, Studio, Custom, About, or Contact in edit mode, click editable text, change it in a side panel, preview it immediately, and publish it.
- Keep products, prices, orders, checkout rules, and customer-submitted content outside the visual text editor so business data cannot be accidentally overwritten.

## Editable content
- Make primary page titles, descriptions, section headings, supporting paragraphs, button labels, announcement text, contact details, and footer promotional copy editable.
- Add per-page top background controls and per-section background controls where a visual section exists.
- Support image upload, removal, replacement, focal-position selection, overlay strength, and accessible image description.
- Keep existing text and images as safe defaults when no custom value is published.

## Theme editor upgrades
- Keep all existing color, type, spacing, header, product-card, button, shadow, motion, grain, preset, and light/dark controls.
- Add global background image, background treatment, navigation/logo sizing, section spacing, border strength, and image-fit controls.
- Add shortcuts from the Theme editor into visual page editing.

## Data and security
- Store published site content in the existing central settings record so both hosting versions read the same content.
- Add a dedicated public-read site-assets image bucket; only authenticated admins can upload, replace, or remove editor images.
- Validate and normalize every content/theme field, limit text lengths and image types/sizes, and preserve compatibility with existing settings.
- Keep all writes protected by the existing server-verified admin role policies.

## cPanel delivery and checks
- Ensure editing, publishing, image upload, and storefront refresh use browser-safe database/storage access and require no Node server.
- Verify admin access, direct text editing, image replacement, persistence after reload, light/dark styling, and mobile/desktop layouts.
- Rebuild the cPanel package, restore both hidden server configuration files required by Apache, inspect the ZIP contents, and provide the updated private package.

## Technical details
- Add additive JSON content/settings fields and storage policies through migrations/configuration; no existing commerce rows are changed.
- Introduce a normalized content registry and reusable editable text/media wrappers, shared by the hosted preview and cPanel SPA.
- Use a query cache invalidation after publishing so changes appear immediately without a deployment.
