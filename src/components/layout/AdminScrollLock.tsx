"use client";

import { useEffect } from "react";

/**
 * Keeps document scroll on `main` only: prevents a second vertical scrollbar on
 * `html`/`body` when nested flex + overflow chains disagree with the viewport.
 */
export default function AdminScrollLock() {
  useEffect(() => {
    const html = document.documentElement;
    const { body } = document;
    const prevHtml = html.style.overflow;
    const prevBody = body.style.overflow;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    return () => {
      html.style.overflow = prevHtml;
      body.style.overflow = prevBody;
    };
  }, []);

  return null;
}
