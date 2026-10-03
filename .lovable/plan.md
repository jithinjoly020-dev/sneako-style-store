# COD, uploaded logo, and advanced theme editor

## What will change
- Add **Cash on Delivery** beside UPI at checkout. UPI keeps the 5% prepaid discount; COD receives no prepaid discount and completes the order without opening the payment page.
- Replace the text logo with the uploaded UNLABELLED logo in the customer header and footer, with automatic contrast for light and dark themes, and derive the site icon from it.
- Expand the admin Theme editor while keeping all existing controls and published themes compatible.

## Advanced theme controls
- Add theme presets with a safe confirmation before replacing current draft values.
- Add separate accent color, selection color, and focus-ring color for light and dark modes.
- Add typography controls for heading weight, body size, heading style, and label letter spacing.
- Add layout controls for storefront width, content density, header treatment, product image shape, and button style.
- Add effects controls for shadow strength and existing motion/grain settings.
- Upgrade the live preview to show navigation, a product card, pricing, buttons, and typography changes together.

## Checkout behavior
- Save `payment_method: "cod"` and `payment_status: "pending"` for COD through the existing secure order function.
- Show payment-specific totals and wording before submission.
- After a COD order is placed, clear the cart, show its order number, and send the same owner notification when email is configured.

## Compatibility and checks
- Normalize every new theme field with defaults, so old saved themes continue working.
- Apply settings through shared theme variables and data attributes across public pages and the static cPanel copy.
- Verify UPI and COD paths, theme save/reload, logo contrast, mobile/desktop layout, favicon, and current preview health.
- Rebuild the cPanel package only when requested; this change prepares the source for it.
