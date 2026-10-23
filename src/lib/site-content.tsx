import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, createElement, useContext, useEffect, useMemo, useState, type CSSProperties, type ElementType, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export type PageBackground = {
  image: string;
  alt: string;
  position: "top" | "center" | "bottom";
  fit: "cover" | "contain";
  overlay: number;
};

export type SiteContent = {
  text: Record<string, string>;
  backgrounds: Record<string, PageBackground>;
  code: Record<string, PageCode>;
};

export type PageCode = { css: string; html: string; js: string };

export const DEFAULT_SITE_CONTENT: SiteContent = { text: {}, backgrounds: {}, code: {} };

function boundedText(value: unknown) {
  return typeof value === "string" ? value.slice(0, 4000) : "";
}

export function normalizeSiteContent(value: unknown): SiteContent {
  const source = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const sourceText = source["text"] && typeof source["text"] === "object" ? source["text"] as Record<string, unknown> : {};
  const sourceBackgrounds = source["backgrounds"] && typeof source["backgrounds"] === "object" ? source["backgrounds"] as Record<string, unknown> : {};
  const text = Object.fromEntries(Object.entries(sourceText).map(([key, value]) => [key.slice(0, 120), boundedText(value)]));
  const backgrounds: Record<string, PageBackground> = {};
  for (const [key, raw] of Object.entries(sourceBackgrounds)) {
    if (!raw || typeof raw !== "object") continue;
    const item = raw as Record<string, unknown>;
    const image = boundedText(item["image"]);
    if (image && !image.startsWith("data:image/") && !image.startsWith("https://") && !image.startsWith("/")) continue;
    backgrounds[key.slice(0, 120)] = {
      image,
      alt: boundedText(item["alt"]).slice(0, 240),
      position: ["top", "center", "bottom"].includes(String(item["position"])) ? item["position"] as PageBackground["position"] : "center",
      fit: item["fit"] === "contain" ? "contain" : "cover",
      overlay: Math.min(90, Math.max(0, Number(item["overlay"]) || 0)),
    };
  }
  const sourceCode = source["code"] && typeof source["code"] === "object" ? source["code"] as Record<string, unknown> : {};
  const code: Record<string, PageCode> = {};
  const big = (v: unknown) => typeof v === "string" ? v.slice(0, 100000) : "";
  for (const [key, raw] of Object.entries(sourceCode)) {
    if (!raw || typeof raw !== "object") continue;
    const item = raw as Record<string, unknown>;
    const entry = { css: big(item["css"]), html: big(item["html"]), js: big(item["js"]) };
    if (entry.css || entry.html || entry.js) code[key.slice(0, 120)] = entry;
  }
  return { text, backgrounds, code };
}

export const siteContentQuery = {
  queryKey: ["site-content"],
  queryFn: async (): Promise<SiteContent> => {
    const { data, error } = await supabase.from("custom_settings").select("site_content").eq("id", 1).maybeSingle();
    if (error) throw error;
    return normalizeSiteContent(data?.site_content);
  },
};

type SiteContentContextValue = {
  content: SiteContent;
  text: (key: string, fallback: string) => string;
  background: (key: string) => PageBackground | undefined;
  editorPreview: boolean;
};

const SiteContentContext = createContext<SiteContentContextValue | null>(null);

export function SiteContentProvider({ children }: { children: ReactNode }) {
  const { data = DEFAULT_SITE_CONTENT } = useQuery(siteContentQuery);
  const [preview, setPreview] = useState<SiteContent | null>(null);
  const [editorPreview, setEditorPreview] = useState(false);
  useEffect(() => {
    setEditorPreview(new URLSearchParams(window.location.search).get("site-editor-preview") === "1");
  }, []);
  useEffect(() => {
    if (!editorPreview) return;
    const receive = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.data?.type !== "site-editor:draft") return;
      setPreview(normalizeSiteContent(event.data.content));
    };
    window.addEventListener("message", receive);
    window.parent.postMessage({ type: "site-editor:ready" }, window.location.origin);
    return () => window.removeEventListener("message", receive);
  }, [editorPreview]);
  const content = preview ?? data;
  const value = useMemo<SiteContentContextValue>(() => ({
    content,
    editorPreview,
    text: (key, fallback) => content.text[key]?.trim() || fallback,
    background: (key) => content.backgrounds[key],
  }), [content, editorPreview]);
  return <SiteContentContext.Provider value={value}>{children}</SiteContentContext.Provider>;
}

export function useSiteContent() {
  const value = useContext(SiteContentContext);
  if (!value) throw new Error("useSiteContent must be used inside SiteContentProvider");
  return value;
}

export function useRefreshSiteContent() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: siteContentQuery.queryKey });
}

export function EditableText({ as = "span", contentKey, fallback, className }: { as?: ElementType; contentKey: string; fallback: string; className?: string }) {
  const { text, editorPreview } = useSiteContent();
  const select = (event: React.MouseEvent) => {
    if (!editorPreview) return;
    event.preventDefault();
    event.stopPropagation();
    window.parent.postMessage({ type: "site-editor:select", key: contentKey, kind: "text" }, window.location.origin);
  };
  return createElement(as, { className, "data-site-edit": editorPreview ? contentKey : undefined, onClick: select }, text(contentKey, fallback));
}

export function EditTarget({ contentKey, children, className }: { contentKey: string; children: ReactNode; className?: string }) {
  const { editorPreview } = useSiteContent();
  return <div className={className} data-site-edit={editorPreview ? contentKey : undefined} onClick={(event) => {
    if (!editorPreview) return;
    event.preventDefault();
    event.stopPropagation();
    window.parent.postMessage({ type: "site-editor:select", key: contentKey, kind: "text" }, window.location.origin);
  }}>{children}</div>;
}

export function EditableBackground({ contentKey, children, className, fallbackImage }: { contentKey: string; children: ReactNode; className?: string; fallbackImage?: string }) {
  const { background, editorPreview } = useSiteContent();
  const value = background(contentKey);
  const image = value?.image || fallbackImage;
  const style: CSSProperties | undefined = image ? { backgroundImage: `url(${JSON.stringify(image).slice(1, -1)})`, backgroundPosition: value?.position ?? "center", backgroundSize: value?.fit ?? "cover", backgroundRepeat: "no-repeat" } : undefined;
  return <div className={`relative ${className ?? ""}`} style={style} data-site-edit={editorPreview ? contentKey : undefined} onClick={(event) => {
    if (!editorPreview || event.target !== event.currentTarget) return;
    event.preventDefault();
    window.parent.postMessage({ type: "site-editor:select", key: contentKey, kind: "background" }, window.location.origin);
  }}>
    {image && (value?.overlay ?? 0) > 0 && <span aria-hidden className="pointer-events-none absolute inset-0 bg-background" style={{ opacity: (value?.overlay ?? 0) / 100 }} />}
    <div className="relative h-full">{children}</div>
  </div>;
}