import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { productsQuery, type Product } from "@/lib/products";
import { money } from "@/lib/cart";
import { downloadCsv } from "@/lib/export-csv";


export const Route = createFileRoute("/admin/products")({
  component: AdminProducts,
});

const empty = {
  name: "",
  slug: "",
  description: "",
  price: "0",
  image_url: "",
  sizes: "S, M, L, XL",
  colors: "",
  category: "tees",
  stock: "0",
  featured: false,
  is_active: true,
};

type FormState = typeof empty;

function toForm(p: Product): FormState {
  return {
    name: p.name,
    slug: p.slug,
    description: p.description,
    price: String(p.price),
    image_url: p.image_url,
    sizes: p.sizes.join(", "),
    colors: p.colors.join(", "),
    category: p.category,
    stock: String(p.stock),
    featured: p.featured,
    is_active: p.is_active,
  };
}

function AdminProducts() {
  const { data: products = [] } = useQuery(productsQuery);
  const qc = useQueryClient();
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [sort, setSort] = useState<"name" | "price" | "stock">("name");


  const startNew = () => {
    setEditing("new");
    setForm({ ...empty });
  };

  const startEdit = (p: Product) => {
    setEditing(p.id);
    setForm(toForm(p));
  };

  async function save() {
    if (!form) return;
    if (form.name.trim().length < 2) {
      toast.error("Product name is required");
      return;
    }
    const slug =
      form.slug.trim() ||
      form.name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
    const payload = {
      name: form.name.trim(),
      slug,
      description: form.description.trim(),
      price: Number(form.price) || 0,
      image_url: form.image_url.trim(),
      sizes: form.sizes
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      colors: form.colors
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      category: form.category.trim() || "tees",
      stock: Number(form.stock) || 0,
      featured: form.featured,
      is_active: form.is_active,
    };
    setSaving(true);
    const res =
      editing === "new"
        ? await supabase.from("products").insert(payload)
        : await supabase.from("products").update(payload).eq("id", editing!);
    setSaving(false);
    if (res.error) {
      toast.error(res.error.message);
      return;
    }
    toast.success(editing === "new" ? "Product added" : "Product updated");
    setEditing(null);
    setForm(null);
    qc.invalidateQueries({ queryKey: ["products"] });
  }

  async function remove(id: string) {
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Product deleted");
    qc.invalidateQueries({ queryKey: ["products"] });
  }

  const set = (key: keyof FormState, value: string | boolean) =>
    setForm((f) => (f ? { ...f, [key]: value } : f));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold md:text-5xl">Products</h1>
        <button
          type="button"
          onClick={startNew}
          className="bg-primary px-5 py-3 text-sm font-medium text-primary-foreground"
        >
          Import new product
        </button>
      </div>

      {form && (
        <div className="mt-8 border border-border bg-surface p-6">
          <p className="label-xs text-muted-foreground">
            {editing === "new" ? "New product" : "Edit product"}
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {(
              [
                ["name", "Name"],
                ["slug", "Slug (optional)"],
                ["price", "Price"],
                ["stock", "Stock"],
                ["category", "Category"],
                ["image_url", "Image URL (e.g. /images/tee-blank.jpg)"],
                ["sizes", "Sizes (comma separated)"],
                ["colors", "Colours (comma separated)"],
              ] as const
            ).map(([key, label]) => (
              <div key={key}>
                <label htmlFor={key} className="label-xs text-muted-foreground">
                  {label}
                </label>
                <input
                  id={key}
                  value={String(form[key])}
                  onChange={(e) => set(key, e.target.value)}
                  className="mt-2 w-full border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
                />
              </div>
            ))}
            <div className="md:col-span-2">
              <label htmlFor="description" className="label-xs text-muted-foreground">
                Description
              </label>
              <textarea
                id="description"
                rows={3}
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                className="mt-2 w-full border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
              />
            </div>
            <label className="label-xs flex items-center gap-2 text-muted-foreground">
              <input
                type="checkbox"
                checked={form.featured}
                onChange={(e) => set("featured", e.target.checked)}
              />
              Featured on homepage
            </label>
            <label className="label-xs flex items-center gap-2 text-muted-foreground">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => set("is_active", e.target.checked)}
              />
              Visible in shop
            </label>
          </div>
          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="bg-primary px-5 py-3 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save product"}
            </button>
            <button
              type="button"
              onClick={() => {
                setForm(null);
                setEditing(null);
              }}
              className="border border-border px-5 py-3 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="mt-10 border border-border">
        {products.map((p) => (
          <div
            key={p.id}
            className="flex flex-wrap items-center gap-4 border-b border-border px-4 py-3 last:border-b-0"
          >
            <img src={p.image_url} alt="" loading="lazy" className="size-12 object-cover" />
            <div className="min-w-40 flex-1">
              <p className="text-sm font-medium">{p.name}</p>
              <p className="label-xs text-muted-foreground">
                {p.category} · {p.is_active ? "live" : "hidden"}
              </p>
            </div>
            <span className="font-mono text-sm">{money(Number(p.price))}</span>
            <span className="label-xs w-20 text-muted-foreground">{p.stock} left</span>
            <button
              type="button"
              onClick={() => startEdit(p)}
              className="label-xs border border-border px-3 py-2"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => remove(p.id)}
              className="label-xs border border-border px-3 py-2 text-destructive"
            >
              Delete
            </button>
          </div>
        ))}
        {products.length === 0 && (
          <p className="label-xs px-4 py-6 text-muted-foreground">No products yet.</p>
        )}
      </div>
    </div>
  );
}
