"use client";

import { useEffect } from "react";

/** Tells the embedding page how tall the widget is, so the iframe has no scrollbar. */
export function Resizer() {
  useEffect(() => {
    if (window.parent === window) return;
    const send = () => window.parent.postMessage({ type: "recrewted:height", height: document.documentElement.scrollHeight }, "*");
    const ro = new ResizeObserver(send);
    ro.observe(document.body);
    send();
    return () => ro.disconnect();
  }, []);
  return null;
}
