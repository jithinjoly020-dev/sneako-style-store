import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ThemeMode = "light" | "dark" | "system";
export type ThemePalette = {
  background: string;
  foreground: string;
  surface: string;
  muted: string;
  mutedForeground: string;
  border: string;
  primary: string;
  primaryForeground: string;
  destructive: string;
  accent: string;
  selection: string;
  ring: string;
};
export type StoreTheme = {
  defaultMode: ThemeMode;
  light: ThemePalette;
  dark: ThemePalette;
  headingFont: "Archivo" | "JetBrains Mono";
  bodyFont: "Archivo" | "JetBrains Mono";
  radius: "square" | "soft" | "rounded";
  motion: "full" | "subtle" | "off";
  grain: boolean;
  headingWeight: "medium" | "semibold" | "bold";
  bodyScale: "compact" | "standard" | "large";
  headingStyle: "tight" | "editorial" | "mono";
  labelSpacing: "tight" | "standard" | "wide";
  containerWidth: "compact" | "standard" | "wide";
  density: "compact" | "comfortable" | "airy";
  headerStyle: "solid" | "glass" | "borderless";
  productRatio: "portrait" | "square" | "landscape";
  buttonStyle: "solid" | "outline" | "soft";
  shadow: "none" | "soft" | "strong";
  navigationSize: "compact" | "standard" | "large";
  logoSize: "compact" | "standard" | "large";
  sectionSpacing: "compact" | "standard" | "large";
  borderStrength: "subtle" | "standard" | "bold";
  imageFit: "cover" | "contain";
};

export const DEFAULT_THEME: StoreTheme = {
  defaultMode: "dark",
  light: {
    background: "#F5F5F3", foreground: "#141414", surface: "#FFFFFF", muted: "#E7E7E3",
    mutedForeground: "#666666", border: "#D2D2CC", primary: "#141414", primaryForeground: "#F5F5F3", destructive: "#B42318", accent: "#DCDCD6", selection: "#C9E2FF", ring: "#2563EB",
  },
  dark: {
    background: "#141414", foreground: "#EDEDED", surface: "#202020", muted: "#2B2B2B",
    mutedForeground: "#9B9B9B", border: "#383838", primary: "#EDEDED", primaryForeground: "#141414", destructive: "#D95C57", accent: "#353535", selection: "#294D78", ring: "#7DB7FF",
  },
  headingFont: "Archivo", bodyFont: "Archivo", radius: "square", motion: "full", grain: true,
  headingWeight: "semibold", bodyScale: "standard", headingStyle: "tight", labelSpacing: "standard",
  containerWidth: "standard", density: "comfortable", headerStyle: "glass", productRatio: "portrait",
  buttonStyle: "solid", shadow: "none",
  navigationSize: "standard", logoSize: "standard", sectionSpacing: "standard", borderStrength: "standard", imageFit: "cover",
};

export const themeQuery = {
  queryKey: ["store-theme"],
  queryFn: async (): Promise<StoreTheme> => {
    const { data, error } = await supabase.from("custom_settings").select("theme").eq("id", 1).maybeSingle();
    if (error) throw error;
    return normalizeTheme(data?.theme);
  },
};

function isHex(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
}

function palette(value: unknown, fallback: ThemePalette): ThemePalette {
  const source = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return Object.fromEntries(Object.entries(fallback).map(([key, defaultValue]) => [key, isHex(source[key]) ? source[key] : defaultValue])) as ThemePalette;
}

export function normalizeTheme(value: unknown): StoreTheme {
  const source = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return {
    defaultMode: ["light", "dark", "system"].includes(String(source["defaultMode"])) ? source["defaultMode"] as ThemeMode : DEFAULT_THEME.defaultMode,
    light: palette(source["light"], DEFAULT_THEME.light),
    dark: palette(source["dark"], DEFAULT_THEME.dark),
    headingFont: source["headingFont"] === "JetBrains Mono" ? "JetBrains Mono" : "Archivo",
    bodyFont: source["bodyFont"] === "JetBrains Mono" ? "JetBrains Mono" : "Archivo",
    radius: ["square", "soft", "rounded"].includes(String(source["radius"])) ? source["radius"] as StoreTheme["radius"] : DEFAULT_THEME.radius,
    motion: ["full", "subtle", "off"].includes(String(source["motion"])) ? source["motion"] as StoreTheme["motion"] : DEFAULT_THEME.motion,
    grain: source["grain"] !== false,
    headingWeight: ["medium", "semibold", "bold"].includes(String(source["headingWeight"])) ? source["headingWeight"] as StoreTheme["headingWeight"] : DEFAULT_THEME.headingWeight,
    bodyScale: ["compact", "standard", "large"].includes(String(source["bodyScale"])) ? source["bodyScale"] as StoreTheme["bodyScale"] : DEFAULT_THEME.bodyScale,
    headingStyle: ["tight", "editorial", "mono"].includes(String(source["headingStyle"])) ? source["headingStyle"] as StoreTheme["headingStyle"] : DEFAULT_THEME.headingStyle,
    labelSpacing: ["tight", "standard", "wide"].includes(String(source["labelSpacing"])) ? source["labelSpacing"] as StoreTheme["labelSpacing"] : DEFAULT_THEME.labelSpacing,
    containerWidth: ["compact", "standard", "wide"].includes(String(source["containerWidth"])) ? source["containerWidth"] as StoreTheme["containerWidth"] : DEFAULT_THEME.containerWidth,
    density: ["compact", "comfortable", "airy"].includes(String(source["density"])) ? source["density"] as StoreTheme["density"] : DEFAULT_THEME.density,
    headerStyle: ["solid", "glass", "borderless"].includes(String(source["headerStyle"])) ? source["headerStyle"] as StoreTheme["headerStyle"] : DEFAULT_THEME.headerStyle,
    productRatio: ["portrait", "square", "landscape"].includes(String(source["productRatio"])) ? source["productRatio"] as StoreTheme["productRatio"] : DEFAULT_THEME.productRatio,
    buttonStyle: ["solid", "outline", "soft"].includes(String(source["buttonStyle"])) ? source["buttonStyle"] as StoreTheme["buttonStyle"] : DEFAULT_THEME.buttonStyle,
    shadow: ["none", "soft", "strong"].includes(String(source["shadow"])) ? source["shadow"] as StoreTheme["shadow"] : DEFAULT_THEME.shadow,
    navigationSize: ["compact", "standard", "large"].includes(String(source["navigationSize"])) ? source["navigationSize"] as StoreTheme["navigationSize"] : DEFAULT_THEME.navigationSize,
    logoSize: ["compact", "standard", "large"].includes(String(source["logoSize"])) ? source["logoSize"] as StoreTheme["logoSize"] : DEFAULT_THEME.logoSize,
    sectionSpacing: ["compact", "standard", "large"].includes(String(source["sectionSpacing"])) ? source["sectionSpacing"] as StoreTheme["sectionSpacing"] : DEFAULT_THEME.sectionSpacing,
    borderStrength: ["subtle", "standard", "bold"].includes(String(source["borderStrength"])) ? source["borderStrength"] as StoreTheme["borderStrength"] : DEFAULT_THEME.borderStrength,
    imageFit: source["imageFit"] === "contain" ? "contain" : DEFAULT_THEME.imageFit,
  };
}

type ThemeContextValue = {
  mode: ThemeMode;
  resolvedMode: "light" | "dark";
  theme: StoreTheme;
  setMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function systemMode() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" as const : "light" as const;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { data = DEFAULT_THEME } = useQuery(themeQuery);
  const [mode, setModeState] = useState<ThemeMode>(DEFAULT_THEME.defaultMode);
  const [system, setSystem] = useState<"light" | "dark">("dark");

  useEffect(() => {
    setSystem(systemMode());
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setSystem(media.matches ? "dark" : "light");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const stored = window.localStorage.getItem("unlabelled-theme");
    setModeState(stored === "light" || stored === "dark" || stored === "system" ? stored : data.defaultMode);
  }, [data.defaultMode]);

  const resolvedMode = mode === "system" ? system : mode;
  useEffect(() => {
    const root = document.documentElement;
    const colors = data[resolvedMode];
    root.classList.toggle("dark", resolvedMode === "dark");
    root.dataset["theme"] = resolvedMode;
    root.dataset["motion"] = data.motion;
    root.dataset["grain"] = String(data.grain);
    root.dataset["headingWeight"] = data.headingWeight;
    root.dataset["bodyScale"] = data.bodyScale;
    root.dataset["headingStyle"] = data.headingStyle;
    root.dataset["labelSpacing"] = data.labelSpacing;
    root.dataset["containerWidth"] = data.containerWidth;
    root.dataset["density"] = data.density;
    root.dataset["headerStyle"] = data.headerStyle;
    root.dataset["productRatio"] = data.productRatio;
    root.dataset["buttonStyle"] = data.buttonStyle;
    root.dataset["shadow"] = data.shadow;
    root.dataset["navigationSize"] = data.navigationSize;
    root.dataset["logoSize"] = data.logoSize;
    root.dataset["sectionSpacing"] = data.sectionSpacing;
    root.dataset["borderStrength"] = data.borderStrength;
    root.dataset["imageFit"] = data.imageFit;
    root.style.setProperty("--background", colors.background);
    root.style.setProperty("--foreground", colors.foreground);
    root.style.setProperty("--surface", colors.surface);
    root.style.setProperty("--surface-foreground", colors.foreground);
    root.style.setProperty("--card", colors.surface);
    root.style.setProperty("--card-foreground", colors.foreground);
    root.style.setProperty("--popover", colors.surface);
    root.style.setProperty("--popover-foreground", colors.foreground);
    root.style.setProperty("--primary", colors.primary);
    root.style.setProperty("--primary-foreground", colors.primaryForeground);
    root.style.setProperty("--secondary", colors.muted);
    root.style.setProperty("--secondary-foreground", colors.foreground);
    root.style.setProperty("--muted", colors.muted);
    root.style.setProperty("--muted-foreground", colors.mutedForeground);
    root.style.setProperty("--accent", colors.accent);
    root.style.setProperty("--accent-foreground", colors.foreground);
    root.style.setProperty("--destructive", colors.destructive);
    root.style.setProperty("--border", colors.border);
    root.style.setProperty("--input", colors.border);
    root.style.setProperty("--ring", colors.ring);
    root.style.setProperty("--selection", colors.selection);
    root.style.setProperty("--font-display", `"${data.headingFont}", ui-sans-serif, system-ui, sans-serif`);
    root.style.setProperty("--font-sans", `"${data.bodyFont}", ui-sans-serif, system-ui, sans-serif`);
    root.style.setProperty("--radius", data.radius === "square" ? "0px" : data.radius === "soft" ? "4px" : "10px");
  }, [data, resolvedMode]);

  const setMode = (next: ThemeMode) => {
    window.localStorage.setItem("unlabelled-theme", next);
    setModeState(next);
  };
  const value = useMemo(() => ({ mode, resolvedMode, theme: data, setMode }), [mode, resolvedMode, data]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useTheme must be used inside ThemeProvider");
  return value;
}

export function useRefreshTheme() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: themeQuery.queryKey });
}