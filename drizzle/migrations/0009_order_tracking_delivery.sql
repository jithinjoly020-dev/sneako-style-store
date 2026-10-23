ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS courier text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS tracking_number text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS tracking_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS expected_delivery date,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz;

CREATE TABLE public.order_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT '',
  location text NOT NULL DEFAULT '',
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_events TO authenticated;
GRANT ALL ON public.order_events TO service_role;
ALTER TABLE public.order_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage order events" ON public.order_events FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX order_events_order_idx ON public.order_events(order_id, created_at);

CREATE OR REPLACE FUNCTION public.track_order(_order_number text, _contact text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE o public.orders; c text := lower(trim(coalesce(_contact,'')));
BEGIN
  IF length(c) < 4 THEN RETURN NULL; END IF;
  SELECT * INTO o FROM public.orders
   WHERE upper(order_number) = upper(trim(_order_number))
     AND (lower(customer_email) = c OR right(regexp_replace(customer_phone,'\D','','g'),10) = right(regexp_replace(c,'\D','','g'),10) AND length(regexp_replace(c,'\D','','g')) >= 10)
   LIMIT 1;
  IF o.id IS NULL THEN RETURN NULL; END IF;
  RETURN jsonb_build_object(
    'order_number', o.order_number, 'status', o.status, 'payment_status', o.payment_status,
    'payment_method', o.payment_method, 'total', o.total, 'shipping_method', o.shipping_method,
    'city', o.city, 'created_at', o.created_at, 'courier', o.courier, 'tracking_number', o.tracking_number,
    'tracking_url', o.tracking_url, 'expected_delivery', o.expected_delivery, 'delivered_at', o.delivered_at,
    'items', (SELECT coalesce(jsonb_agg(jsonb_build_object('name', product_name, 'size', size, 'quantity', quantity) ORDER BY created_at), '[]') FROM public.order_items WHERE order_id = o.id),
    'events', (SELECT coalesce(jsonb_agg(jsonb_build_object('status', status, 'location', location, 'note', note, 'created_at', created_at) ORDER BY created_at DESC), '[]') FROM public.order_events WHERE order_id = o.id));
END $$;
GRANT EXECUTE ON FUNCTION public.track_order(text, text) TO anon, authenticated;