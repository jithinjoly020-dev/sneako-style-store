# Studio Virtual Try-On

## What will be added
- Add a full-width **Virtual Fitting Studio** section to the Studio page.
- Load active t-shirts from the existing shop catalogue and let customers switch products.
- Provide two modes:
  - **Live camera:** show the customer’s camera with a movable and resizable shirt layer for an instant fit preview.
  - **AI photo try-on:** accept a front-facing photo, combine it with the selected product image, and return a realistic generated preview.
- Include clear camera permission, photo privacy, loading, error, retry, reset, and download states.
- Keep the current dark minimal design and site-wide motion style.

## Technical details
- Build the live camera mode entirely in the browser with camera permissions and adjustable overlay controls.
- Add a private server image-editing endpoint using Lovable AI; the secret remains server-side.
- Stream partial AI previews and only mark the result complete after the final image arrives.
- Validate image type and size before upload, preserve the person and shirt details through the edit prompt, and avoid permanent photo storage.
- Verify desktop and mobile layouts, camera fallback behavior, product switching, upload flow, and current build diagnostics.

## Limitation
- The live camera mode is an adjustable visual overlay, not body tracking. The AI photo mode produces the more realistic fitted result and consumes workspace AI credits.
