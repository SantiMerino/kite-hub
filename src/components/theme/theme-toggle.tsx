"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

function readResolvedClass(): "light" | "dark" {
  if (typeof document === "undefined") return "light";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export default function ThemeToggle() {
  const { setTheme } = useTheme();

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="relative size-9"
      onClick={() => {
        const next = readResolvedClass() === "dark" ? "light" : "dark";
        setTheme(next);
      }}
      aria-label="Cambiar entre tema claro y oscuro"
    >
      <Sun
        className="size-4 absolute inset-0 m-auto scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90"
        aria-hidden
      />
      <Moon
        className="size-4 absolute inset-0 m-auto scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0"
        aria-hidden
      />
    </Button>
  );
}
