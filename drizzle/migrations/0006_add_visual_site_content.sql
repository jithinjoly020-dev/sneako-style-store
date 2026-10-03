ALTER TABLE public.custom_settings
  ADD COLUMN IF NOT EXISTS site_content jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.custom_settings.site_content IS 'Validated storefront copy, page media, and visual editor settings shared by hosted and static builds.';