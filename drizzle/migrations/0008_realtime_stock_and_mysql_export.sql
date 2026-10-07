DO $$ BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.orders; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.products; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

CREATE OR REPLACE FUNCTION public.reduce_stock_on_item()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.product_id IS NOT NULL THEN
    UPDATE public.products SET stock = greatest(0, stock - NEW.quantity) WHERE id = NEW.product_id;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS order_items_reduce_stock ON public.order_items;
CREATE TRIGGER order_items_reduce_stock AFTER INSERT ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public.reduce_stock_on_item();

CREATE OR REPLACE FUNCTION public.gateway_export(_token text, _since timestamptz)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.gateway_check_token(_token) THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN jsonb_build_object(
    'orders', coalesce((SELECT jsonb_agg(to_jsonb(o)) FROM (SELECT * FROM public.orders WHERE updated_at > _since ORDER BY updated_at LIMIT 500) o), '[]'),
    'items', coalesce((SELECT jsonb_agg(to_jsonb(i)) FROM public.order_items i WHERE i.order_id IN (SELECT id FROM public.orders WHERE updated_at > _since ORDER BY updated_at LIMIT 500)), '[]'),
    'products', coalesce((SELECT jsonb_agg(to_jsonb(p)) FROM public.products p WHERE updated_at > _since), '[]')
  );
END $$;
GRANT EXECUTE ON FUNCTION public.gateway_export(text, timestamptz) TO anon, authenticated;