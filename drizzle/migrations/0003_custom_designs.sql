CREATE TABLE public.custom_settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  enabled boolean NOT NULL DEFAULT true,
  base_price numeric NOT NULL DEFAULT 999,
  front_print_price numeric NOT NULL DEFAULT 200,
  back_print_price numeric NOT NULL DEFAULT 250,
  colors text[] NOT NULL DEFAULT ARRAY['Black','White','Grey','Navy','Olive'],
  sizes text[] NOT NULL DEFAULT ARRAY['S','M','L','XL','XXL'],
  notes text NOT NULL DEFAULT 'Upload a high-resolution PNG (transparent background works best). We review every design before printing.',
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.custom_settings (id) VALUES (1);
GRANT SELECT ON public.custom_settings TO anon, authenticated;
GRANT UPDATE ON public.custom_settings TO authenticated;
GRANT ALL ON public.custom_settings TO service_role;
ALTER TABLE public.custom_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone reads custom settings" ON public.custom_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admins update custom settings" ON public.custom_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.custom_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_number text NOT NULL DEFAULT ('CUS-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8))),
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  customer_phone text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  color text NOT NULL DEFAULT '',
  size text NOT NULL DEFAULT '',
  quantity int NOT NULL DEFAULT 1 CHECK (quantity BETWEEN 1 AND 500),
  placement text NOT NULL DEFAULT 'front',
  design_path text NOT NULL DEFAULT '',
  design_text text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  estimated_total numeric NOT NULL DEFAULT 0,
  quoted_price numeric,
  admin_notes text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','reviewing','quoted','approved','printing','shipped','delivered','rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.custom_orders TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.custom_orders TO authenticated;
GRANT ALL ON public.custom_orders TO service_role;
ALTER TABLE public.custom_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone submits custom orders" ON public.custom_orders FOR INSERT TO anon, authenticated
  WITH CHECK (status = 'new' AND quoted_price IS NULL AND admin_notes = '');
CREATE POLICY "admins read custom orders" ON public.custom_orders FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins update custom orders" ON public.custom_orders FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins delete custom orders" ON public.custom_orders FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER custom_orders_touch BEFORE UPDATE ON public.custom_orders FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE POLICY "anyone uploads custom designs" ON storage.objects FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'custom-designs');
CREATE POLICY "admins read custom designs" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'custom-designs' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins delete custom designs" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'custom-designs' AND public.has_role(auth.uid(),'admin'));