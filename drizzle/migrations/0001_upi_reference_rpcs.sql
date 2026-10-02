create or replace function public.submit_upi_reference(_order_id uuid, _reference text)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  _ref text := upper(regexp_replace(coalesce(_reference,''), '\s+', '', 'g'));
  _total numeric;
begin
  if _ref !~ '^\d{12}$' then
    raise exception 'Enter the 12-digit UPI reference / UTR number from your payment app';
  end if;
  if exists (select 1 from public.orders where payment_ref = _ref and id <> _order_id) then
    raise exception 'That UPI reference is already used on another order.';
  end if;
  update public.orders
     set payment_status = 'awaiting_verification', payment_ref = _ref
   where id = _order_id and payment_status in ('pending','payment_failed','awaiting_verification')
  returning total into _total;
  if _total is null then
    raise exception 'Order not found or already paid.';
  end if;
  return _total;
end;
$$;

create or replace function public.order_payment_status(_order_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select payment_status from public.orders where id = _order_id), 'pending')
$$;

revoke all on function public.submit_upi_reference(uuid, text) from public;
revoke all on function public.order_payment_status(uuid) from public;
grant execute on function public.submit_upi_reference(uuid, text) to anon, authenticated;
grant execute on function public.order_payment_status(uuid) to anon, authenticated;