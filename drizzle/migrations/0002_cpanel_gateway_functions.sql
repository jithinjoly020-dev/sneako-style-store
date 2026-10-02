-- Used only by the cPanel PHP payment helper, which holds a private access code.
CREATE OR REPLACE FUNCTION public.gateway_check_token(_token text)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT encode(sha256(convert_to(coalesce(_token,''), 'UTF8')), 'hex')
         = '3556b95040f8951465c7df69857ebaf2f399c4652760a4d7943ea41a33dddd2a'
$$;

CREATE OR REPLACE FUNCTION public.gateway_order_info(_token text, _order_id uuid)
RETURNS TABLE(id uuid, order_number text, total numeric, customer_name text, customer_phone text, payment_status text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.gateway_check_token(_token) THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY SELECT o.id, o.order_number, o.total, o.customer_name, o.customer_phone, o.payment_status
    FROM public.orders o WHERE o.id = _order_id;
END $$;

CREATE OR REPLACE FUNCTION public.gateway_mark_paid(_token text, _order_id uuid, _amount numeric, _ref text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o record;
BEGIN
  IF NOT public.gateway_check_token(_token) THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT * INTO o FROM public.orders WHERE id = _order_id;
  IF NOT FOUND THEN RETURN 'not_found'; END IF;
  IF o.payment_status = 'paid' THEN RETURN 'paid'; END IF;
  IF _amount + 0.01 < o.total THEN RETURN 'amount_mismatch'; END IF;
  UPDATE public.orders SET payment_status = 'paid', status = 'confirmed',
    payment_ref = left(coalesce(nullif(_ref,''), _order_id::text), 64)
  WHERE id = _order_id;
  RETURN 'paid';
END $$;

REVOKE ALL ON FUNCTION public.gateway_order_info(text, uuid) FROM public;
REVOKE ALL ON FUNCTION public.gateway_mark_paid(text, uuid, numeric, text) FROM public;
GRANT EXECUTE ON FUNCTION public.gateway_order_info(text, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.gateway_mark_paid(text, uuid, numeric, text) TO anon, authenticated;