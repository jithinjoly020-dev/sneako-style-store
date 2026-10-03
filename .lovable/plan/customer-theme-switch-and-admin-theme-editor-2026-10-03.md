# Customer theme switch and admin theme editor

## What will be added
- Add a sun/moon control in the customer header with Light, Dark, and System behavior saved on the customer’s device.
- Add an admin **Theme** page with live preview, preset themes, light and dark color controls, typography, corner style, effects, and a reset option.
- Save the published storefront theme centrally so changes apply to all public pages, including the cPanel copy.
- Keep the existing dark unlabelled design as the starting theme and preserve accessibility with readable contrast and clear focus states.

## Admin controls
- Brand, background, surface, text, muted text, border, and destructive colors for both modes.
- Heading/body font choices from the fonts already loaded by the site.
- Square/soft/rounded corner styles, animation intensity, film grain, and default customer mode.
- Live storefront sample, unsaved-change warning, Save/Publish, and Restore defaults.

## Technical details
- Add one public-readable, admin-update-only theme settings row with row-level security.
- Apply theme values as validated CSS variables at the app root; local customer choice overrides the admin default.
- Add a reusable theme provider and switcher, then connect the admin editor through the existing protected admin area.
- Verify desktop/mobile switching, persistence, admin save/reload, and the cPanel build path.
