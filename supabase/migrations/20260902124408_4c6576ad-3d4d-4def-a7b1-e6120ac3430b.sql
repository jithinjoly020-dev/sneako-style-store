alter table public.orders
  add column if not exists subtotal numeric not null default 0,
  add column if not exists discount numeric not null default 0,
  add column if not exists shipping_method text not null default 'standard',
  add column if not exists shipping_fee numeric not null default 0,
  add column if not exists payment_status text not null default 'pending',
  add column if not exists payment_ref text;

drop policy if exists "Anyone can read product images" on storage.objects;
create policy "Anyone can read product images"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'product-images');

drop policy if exists "Admins manage product images" on storage.objects;
create policy "Admins manage product images"
on storage.objects for all
to authenticated
using (bucket_id = 'product-images' and public.has_role(auth.uid(), 'admin'))
with check (bucket_id = 'product-images' and public.has_role(auth.uid(), 'admin'));