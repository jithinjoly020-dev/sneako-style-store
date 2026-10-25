CREATE TABLE public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  actor_email text NOT NULL DEFAULT '',
  area text NOT NULL,
  action text NOT NULL,
  record_id text NOT NULL DEFAULT '',
  summary text NOT NULL DEFAULT '',
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.activity_logs TO authenticated;
GRANT ALL ON public.activity_logs TO service_role;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read activity" ON public.activity_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "users log own activity" ON public.activity_logs FOR INSERT TO authenticated WITH CHECK (actor_id = auth.uid());
CREATE INDEX activity_logs_created_idx ON public.activity_logs (created_at DESC);

CREATE OR REPLACE FUNCTION public.log_activity() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r jsonb; o jsonb; label text; changed jsonb := '{}'::jsonb; k text; uid uuid := auth.uid(); em text := '';
BEGIN
  IF TG_OP = 'DELETE' THEN r := to_jsonb(OLD); ELSE r := to_jsonb(NEW); END IF;
  IF TG_OP = 'UPDATE' THEN
    o := to_jsonb(OLD);
    FOR k IN SELECT jsonb_object_keys(r) LOOP
      IF k NOT IN ('updated_at') AND (r->k) IS DISTINCT FROM (o->k) AND k <> 'theme' AND k <> 'site_content' THEN
        changed := changed || jsonb_build_object(k, jsonb_build_object('from', o->k, 'to', r->k));
      ELSIF k IN ('theme','site_content') AND (r->k) IS DISTINCT FROM (o->k) THEN
        changed := changed || jsonb_build_object(k, 'changed');
      END IF;
    END LOOP;
    IF changed = '{}'::jsonb THEN RETURN NULL; END IF;
  END IF;
  label := coalesce(r->>'order_number', r->>'request_number', r->>'name', r->>'upi_id', r->>'status', r->>'id', '');
  IF uid IS NOT NULL THEN SELECT coalesce(email,'') INTO em FROM auth.users WHERE id = uid; END IF;
  INSERT INTO public.activity_logs(actor_id, actor_email, area, action, record_id, summary, details)
  VALUES (uid, coalesce(em, ''), TG_TABLE_NAME, lower(TG_OP), coalesce(r->>'id',''), label,
    CASE WHEN TG_OP = 'UPDATE' THEN changed ELSE r - 'theme' - 'site_content' - 'design_path' END);
  RETURN NULL;
END $$;

CREATE TRIGGER log_orders AFTER INSERT OR UPDATE OR DELETE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.log_activity();
CREATE TRIGGER log_products AFTER INSERT OR UPDATE OR DELETE ON public.products FOR EACH ROW EXECUTE FUNCTION public.log_activity();
CREATE TRIGGER log_order_events AFTER INSERT OR UPDATE OR DELETE ON public.order_events FOR EACH ROW EXECUTE FUNCTION public.log_activity();
CREATE TRIGGER log_custom_orders AFTER INSERT OR UPDATE OR DELETE ON public.custom_orders FOR EACH ROW EXECUTE FUNCTION public.log_activity();
CREATE TRIGGER log_custom_settings AFTER UPDATE ON public.custom_settings FOR EACH ROW EXECUTE FUNCTION public.log_activity();
CREATE TRIGGER log_upi_accounts AFTER INSERT OR UPDATE OR DELETE ON public.upi_accounts FOR EACH ROW EXECUTE FUNCTION public.log_activity();
CREATE TRIGGER log_user_roles AFTER INSERT OR UPDATE OR DELETE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.log_activity();