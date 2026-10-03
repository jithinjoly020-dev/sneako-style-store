import { Laptop, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme, type ThemeMode } from "@/lib/theme";

const order: ThemeMode[] = ["light", "dark", "system"];

export function ThemeToggle() {
  const { mode, setMode } = useTheme();
  const next = order[(order.indexOf(mode) + 1) % order.length] ?? "light";
  const Icon = mode === "light" ? Sun : mode === "dark" ? Moon : Laptop;
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={() => setMode(next)}
      aria-label={`Theme: ${mode}. Switch to ${next}`}
      title={`Theme: ${mode}`}
      className="size-9"
    >
      <Icon className="size-4" />
    </Button>
  );
}