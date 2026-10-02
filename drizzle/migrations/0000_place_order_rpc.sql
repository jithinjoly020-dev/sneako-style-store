create or replace function public.place_order(_order jsonb, _items jsonb)
returns table (id uuid, order_number text)
language plpgsql
security definer
set search_path = public
as $$
declare
  _id uuid;
  _num text;
begin
  if jsonb_typeof(_items) <> 'array' or jsonb_array_length(_items) = 0 or jsonb_array_length(_items) > 50 then
    raise exception 'Cart is empty';
  end if;
  if length(coalesce(_order->>'customer_name','')) < 2 or length(coalesce(_order->>'customer_email','')) < 3 then
    raise exception 'Missing customer details';
  end if;

  insert into public.orders (customer_name, customer_email, customer_phone, address_line, city, postal_code, country, notes,
    subtotal, discount, shipping_method, shipping_fee, total, payment_method, payment_status)
  values (
    left(_order->>'customer_name',100), left(_order->>'customer_email',255), left(coalesce(_order->>'customer_phone',''),30),
    left(coalesce(_order->>'address_line',''),200), left(coalesce(_order->>'city',''),100), left(coalesce(_order->>'postal_code',''),20),
    left(coalesce(_order->>'country',''),100), left(coalesce(_order->>'notes',''),500),
    greatest(0, coalesce((_order->>'subtotal')::numeric,0)), greatest(0, coalesce((_order->>'discount')::numeric,0)),
    left(coalesce(_order->>'shipping_method','standard'),30), greatest(0, coalesce((_order->>'shipping_fee')::numeric,0)),
    greatest(0, coalesce((_order->>'total')::numeric,0)), 'upi', 'pending')
  returning orders.id, orders.order_number into _id, _num;

  insert into public.order_items (order_id, product_id, product_name, size, quantity, unit_price)
  select _id, nullif(i->>'product_id','')::uuid, left(i->>'product_name',200), left(coalesce(i->>'size',''),20),
         greatest(1, least(99, coalesce((i->>'quantity')::int,1))), greatest(0, coalesce((i->>'unit_price')::numeric,0))
  from jsonb_array_elements(_items) i;

  return query select _id, _num;
end;
$$;

revoke all on function public.place_order(jsonb, jsonb) from public;
grant execute on function public.place_order(jsonb, jsonb) to anon, authenticated;