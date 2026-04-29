"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ThemeValue = "light" | "dark" | "system";

const THEME_OPTIONS: Array<{ value: ThemeValue; label: string; icon: typeof Sun }> = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Oscuro", icon: Moon },
  { value: "system", label: "Sistema", icon: Monitor },
];

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="h-9 w-28 rounded-md border border-input bg-background" aria-hidden />
    );
  }

  const selectedTheme = (theme ?? "system") as ThemeValue;
  const SelectedIcon = THEME_OPTIONS.find((option) => option.value === selectedTheme)?.icon ?? Monitor;

  return (
    <Select value={selectedTheme} onValueChange={(value) => setTheme(value as ThemeValue)}>
      <SelectTrigger className="w-28 gap-2">
        <SelectedIcon className="size-4" />
        <SelectValue aria-label="Tema" />
      </SelectTrigger>
      <SelectContent align="end">
        {THEME_OPTIONS.map((option) => {
          const Icon = option.icon;
          return (
            <SelectItem key={option.value} value={option.value}>
              <span className="inline-flex items-center gap-2">
                <Icon className="size-4" />
                {option.label}
              </span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
