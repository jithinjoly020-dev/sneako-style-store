# Host the homepage video on cPanel

## Changes
- Keep the CDN video for the Lovable-hosted preview.
- Make the cPanel build load MP4 and WebM copies from `/videos/` on `frxsuper.store`.
- Remove the still-image poster from the cPanel version so the local video is the homepage background.
- Rebuild the private cPanel ZIP with both video files, payment configuration, and hidden Apache files included.

## Verification
- Confirm the ZIP contains both local video formats and required hidden/payment files.
- Open the packaged site locally and verify the video loads from `/videos/`, autoplays, loops, and produces no browser errors.

## Limitation
- No cPanel/FTP login is available in this workspace, so I can prepare the complete upload package but cannot place it on `frxsuper.store` directly.
