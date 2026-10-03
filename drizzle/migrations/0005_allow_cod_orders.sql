CREATE OR REPLACE FUNCTION public.place_order(_order jsonb, _items jsonb)
RETURNS TABLE(id uuid, order_number text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _id uuid;
  _num text;
  _payment_method text := lower(coalesce(_order->>'payment_method', 'upi'));
  _discount numeric;
BEGIN
  IF jsonb_typeof(_items) <> 'array' OR jsonb_array_length(_items) = 0 OR jsonb_array_length(_items) > 50 THEN
    RAISE EXCEPTION 'Cart is empty';
  END IF;
  IF length(coalesce(_order->>'customer_name','')) < 2 OR length(coalesce(_order->>'customer_email','')) < 3 THEN
    RAISE EXCEPTION 'Missing customer details';
  END IF;
  IF _payment_method NOT IN ('upi', 'cod') THEN
    RAISE EXCEPTION 'Unsupported payment method';
  END IF;

  _discount := CASE
    WHEN _payment_method = 'upi' THEN greatest(0, coalesce((_order->>'discount')::numeric, 0))
    ELSE 0
  END;

  INSERT INTO public.orders (
    customer_name, customer_email, customer_phone, address_line, city, postal_code, country, notes,
    subtotal, discount, shipping_method, shipping_fee, total, payment_method, payment_status
  )
  VALUES (
    left(_order->>'customer_name',100), left(_order->>'customer_email',255), left(coalesce(_order->>'customer_phone',''),30),
    left(coalesce(_order->>'address_line',''),200), left(coalesce(_order->>'city',''),100), left(coalesce(_order->>'postal_code',''),20),
    left(coalesce(_order->>'country',''),100), left(coalesce(_order->>'notes',''),500),
    greatest(0, coalesce((_order->>'subtotal')::numeric,0)), _discount,
    left(coalesce(_order->>'shipping_method','standard'),30), greatest(0, coalesce((_order->>'shipping_fee')::numeric,0)),
    greatest(0, coalesce((_order->>'total')::numeric,0)), _payment_method, 'pending'
  )
  RETURNING orders.id, orders.order_number INTO _id, _num;

  INSERT INTO public.order_items (order_id, product_id, product_name, size, quantity, unit_price)
  SELECT _id, nullif(i->>'product_id','')::uuid, left(i->>'product_name',200), left(coalesce(i->>'size',''),20),
         greatest(1, least(99, coalesce((i->>'quantity')::int,1))), greatest(0, coalesce((i->>'unit_price')::numeric,0))
  FROM jsonb_array_elements(_items) i;

  RETURN QUERY SELECT _id, _num;
END;
$function$;