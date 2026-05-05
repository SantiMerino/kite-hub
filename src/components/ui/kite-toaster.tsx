"use client";

import { Toaster } from "sileo";
import { useTheme } from "next-themes";

/**
 * Single Sileo Toaster instance mounted in the root layout.
 * Reads next-themes' resolved theme so the toast fill matches the app's
 * manual dark/light toggle (not just the OS preference).
 */
export default function KiteToaster() {
  const { resolvedTheme } = useTheme();
  const theme = resolvedTheme === "dark" ? "dark" : "light";

  return (
    <Toaster
      position="top-center"
      theme={theme}
      options={{
        styles: {
          title: "font-medium!",
          description: "text-muted-foreground!",
        },
      }}
    />
  );
}
