/**
 * Must match `ThemeProvider` `storageKey` and the `beforeInteractive` boot script in the root layout.
 */
export const THEME_STORAGE_KEY = "theme" as const;

/**
 * Applies `light` / `dark` on `<html>` before React hydrates, mirroring next-themes resolution
 * for `defaultTheme="system"` and stored `light` | `dark` | `system`.
 */
export const themeBootScript = `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)};var t=localStorage.getItem(k);var r;if(t==="dark"||t==="light")r=t;else if(t==="system"||!t)r=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";else r="light";var e=document.documentElement;e.classList.remove("light","dark");e.classList.add(r);}catch(x){}})();`;
