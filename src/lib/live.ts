import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

/** Admin: refresh order lists the moment an order is placed or changed. */
export function useLiveOrders() {
  const qc = useQueryClient();
  useEffect(() => {
    const ch = supabase
      .channel("admin-orders-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, (p) => {
        if (p.eventType === "INSERT") {
          const n = (p.new as { order_number?: string }).order_number;
          toast.success(`New order ${n ?? ""}`.trim());
        }
        qc.invalidateQueries({ queryKey: ["admin-orders"] });
      })
      .subscribe();
    return () => void supabase.removeChannel(ch);
  }, [qc]);
}

/** Shop: refresh product stock and prices live. */
export function useLiveProducts() {
  const qc = useQueryClient();
  useEffect(() => {
    const ch = supabase
      .channel("products-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => {
        qc.invalidateQueries({ queryKey: ["products"] });
        qc.invalidateQueries({ queryKey: ["product"] });
      })
      .subscribe();
    return () => void supabase.removeChannel(ch);
  }, [qc]);
}
