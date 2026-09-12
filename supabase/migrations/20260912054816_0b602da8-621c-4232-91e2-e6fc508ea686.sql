CREATE TABLE public.upi_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL DEFAULT '',
  upi_id text NOT NULL,
  payee_name text NOT NULL DEFAULT 'unlabelled',
  is_active boolean NOT NULL DEFAULT true,
  is_default boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (upi_id)
);

GRANT SELECT ON public.upi_accounts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.upi_accounts TO authenticated;
GRANT ALL ON public.upi_accounts TO service_role;

ALTER TABLE public.upi_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon reads active upi accounts" ON public.upi_accounts
  FOR SELECT TO anon USING (is_active);

CREATE POLICY "users read upi accounts" ON public.upi_accounts
  FOR SELECT TO authenticated USING (is_active OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins manage upi accounts" ON public.upi_accounts
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER upi_accounts_touch BEFORE UPDATE ON public.upi_accounts
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.upi_accounts (label, upi_id, payee_name, is_active, is_default, sort_order)
VALUES ('Primary', '8590233909@upi', 'unlabelled', true, true, 0);