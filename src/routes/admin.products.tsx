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
  gallery: [] as string[],
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
    gallery: p.gallery ?? [],
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
  const [uploading, setUploading] = useState(false);

  async function uploadImages(files: File[]) {
    for (const f of files) await uploadImage(f, true);
  }

  async function uploadImage(file: File, toGallery = false) {
    if (!file.type.startsWith("image/")) {
      toast.error("Choose an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5 MB");
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage
      .from("product-images")
      .upload(path, file, { cacheControl: "31536000", upsert: false });
    if (error) {
      setUploading(false);
      toast.error(error.message);
      return;
    }
    const { data, error: signError } = await supabase.storage
      .from("product-images")
      .createSignedUrl(path, 60 * 60 * 24 * 3650);
    setUploading(false);
    if (signError || !data) {
      toast.error(signError?.message ?? "Could not fetch the image URL");
      return;
    }
    setForm((f) => {
      if (!f) return f;
      if (toGallery && f.image_url) return { ...f, gallery: [...f.gallery, data.signedUrl] };
      return { ...f, image_url: data.signedUrl };
    });
    toast.success("Image uploaded");
  }


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
      gallery: form.gallery.filter((g) => g && g !== form.image_url.trim()),
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

  const set = (key: keyof FormState, value: string | boolean | string[]) =>
    setForm((f) => (f ? { ...f, [key]: value } : f));

  const categories = ["all", ...Array.from(new Set(products.map((p) => p.category)))];

  const term = q.trim().toLowerCase();
  const visible = products
    .filter((p) => cat === "all" || p.category === cat)
    .filter(
      (p) => !term || `${p.name} ${p.slug} ${p.category}`.toLowerCase().includes(term),
    )
    .sort((a, b) => {
      if (sort === "price") return Number(a.price) - Number(b.price);
      if (sort === "stock") return a.stock - b.stock;
      return a.name.localeCompare(b.name);
    });

  const lowStock = products.filter((p) => p.stock < 20).length;

  async function patch(id: string, values: Partial<Product>, msg: string) {
    const { error } = await supabase.from("products").update(values).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(msg);
    qc.invalidateQueries({ queryKey: ["products"] });
  }

  const adjustStock = (p: Product, delta: number) =>
    patch(p.id, { stock: Math.max(0, p.stock + delta) }, "Stock updated");
  const toggleActive = (p: Product) =>
    patch(p.id, { is_active: !p.is_active }, p.is_active ? "Hidden from shop" : "Published");
  const toggleFeatured = (p: Product) =>
    patch(p.id, { featured: !p.featured }, p.featured ? "Removed from homepage" : "Featured");

  async function duplicate(p: Product) {
    const suffix = Date.now().toString().slice(-4);
    const { error } = await supabase.from("products").insert({
      name: `${p.name} copy`,
      slug: `${p.slug}-copy-${suffix}`,
      description: p.description,
      price: p.price,
      image_url: p.image_url,
      gallery: p.gallery,
      sizes: p.sizes,
      colors: p.colors,
      category: p.category,
      stock: p.stock,
      featured: false,
      is_active: false,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Product duplicated as a hidden draft");
    qc.invalidateQueries({ queryKey: ["products"] });
  }

  function exportCsv() {
    downloadCsv(
      `products-${new Date().toISOString().slice(0, 10)}.csv`,
      visible.map((p) => ({
        name: p.name,
        slug: p.slug,
        category: p.category,
        price: Number(p.price),
        stock: p.stock,
        sizes: p.sizes.join(" / "),
        colors: p.colors.join(" / "),
        featured: p.featured,
        active: p.is_active,
        image_url: p.image_url,
      })),
    );
  }


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
                ["sizes", "Sizes (comma separated — leave empty for no size)"],
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
            <div className="md:col-span-2 border border-dashed border-border p-4">
              <label htmlFor="image_file" className="label-xs text-muted-foreground">
                Product images — pick one or many (first becomes the main image)
              </label>
              <div className="mt-3 flex flex-wrap items-center gap-4">
                <input
                  id="image_file"
                  type="file"
                  accept="image/*"
                  multiple
                  disabled={uploading}
                  onChange={(e) => {
                    const files = Array.from(e.target.files ?? []);
                    if (files.length) void uploadImages(files);
                    e.target.value = "";
                  }}
                  className="text-xs"
                />
                {uploading && <span className="label-xs text-muted-foreground">Uploading…</span>}
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                {[form.image_url, ...form.gallery].filter(Boolean).map((url, i) => (
                  <div key={url + i} className="relative">
                    <img src={url} alt={`Product image ${i + 1}`} className="size-20 object-cover" />
                    <span className="label-xs absolute left-1 top-1 bg-background px-1">
                      {i === 0 ? "Main" : i + 1}
                    </span>
                    <div className="mt-1 flex gap-1">
                      {i > 0 && (
                        <button
                          type="button"
                          className="label-xs border border-border px-1"
                          onClick={() =>
                            setForm((f) =>
                              f
                                ? {
                                    ...f,
                                    image_url: url,
                                    gallery: [f.image_url, ...f.gallery.filter((g) => g !== url)].filter(Boolean),
                                  }
                                : f,
                            )
                          }
                        >
                          Main
                        </button>
                      )}
                      <button
                        type="button"
                        className="label-xs border border-border px-1 text-destructive"
                        onClick={() =>
                          setForm((f) => {
                            if (!f) return f;
                            if (i === 0) {
                              const [next = "", ...rest] = f.gallery;
                              return { ...f, image_url: next, gallery: rest };
                            }
                            return { ...f, gallery: f.gallery.filter((g) => g !== url) };
                          })
                        }
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <label className="label-xs flex items-center gap-2 text-muted-foreground md:col-span-2">
              <input
                type="checkbox"
                checked={form.sizes.trim() === ""}
                onChange={(e) => set("sizes", e.target.checked ? "" : "S, M, L, XL")}
              />
              No sizes for this product (e.g. caps, bags, accessories)
            </label>
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

      <div className="mt-10 flex flex-wrap items-center gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search products…"
          className="w-56 border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
        />
        <select
          value={cat}
          onChange={(e) => setCat(e.target.value)}
          className="border border-border bg-background px-3 py-2 text-xs"
        >
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as typeof sort)}
          className="border border-border bg-background px-3 py-2 text-xs"
        >
          <option value="name">Sort: name</option>
          <option value="price">Sort: price</option>
          <option value="stock">Sort: stock</option>
        </select>
        <button
          type="button"
          onClick={exportCsv}
          className="label-xs border border-border px-4 py-2.5"
        >
          Export CSV
        </button>
        <span className="label-xs text-muted-foreground">
          {visible.length} shown · {lowStock} low stock
        </span>
      </div>

      <div className="mt-5 border border-border">
        {visible.map((p) => (
          <div
            key={p.id}
            className="flex flex-wrap items-center gap-4 border-b border-border px-4 py-3 last:border-b-0"
          >
            <img src={p.image_url} alt="" loading="lazy" className="size-12 object-cover" />
            <div className="min-w-40 flex-1">
              <p className="text-sm font-medium">{p.name}</p>
              <p className="label-xs text-muted-foreground">
                {p.category} · {p.is_active ? "live" : "hidden"}
                {p.featured ? " · featured" : ""}
              </p>
            </div>
            <span className="font-mono text-sm">{money(Number(p.price))}</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label={`Decrease stock for ${p.name}`}
                onClick={() => adjustStock(p, -1)}
                className="label-xs border border-border px-2 py-1.5"
              >
                −
              </button>
              <span
                className={
                  p.stock < 20
                    ? "label-xs w-16 text-center text-destructive"
                    : "label-xs w-16 text-center text-muted-foreground"
                }
              >
                {p.stock} left
              </span>
              <button
                type="button"
                aria-label={`Increase stock for ${p.name}`}
                onClick={() => adjustStock(p, 1)}
                className="label-xs border border-border px-2 py-1.5"
              >
                +
              </button>
            </div>
            <button
              type="button"
              onClick={() => toggleActive(p)}
              className="label-xs border border-border px-3 py-2"
            >
              {p.is_active ? "Hide" : "Publish"}
            </button>
            <button
              type="button"
              onClick={() => toggleFeatured(p)}
              className="label-xs border border-border px-3 py-2"
            >
              {p.featured ? "Unfeature" : "Feature"}
            </button>
            <button
              type="button"
              onClick={() => duplicate(p)}
              className="label-xs border border-border px-3 py-2"
            >
              Duplicate
            </button>
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
        {visible.length === 0 && (
          <p className="label-xs px-4 py-6 text-muted-foreground">No products match.</p>
        )}
      </div>

    </div>
  );
}
