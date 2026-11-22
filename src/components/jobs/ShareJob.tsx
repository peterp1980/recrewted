"use client";

import { useState } from "react";
import { Arrow, Tick } from "@/components/marks";

/**
 * Share a job: the device's share sheet where available, otherwise WhatsApp and "copy link".
 * Only the public job URL is shared; nothing is tracked here.
 */
export function ShareJob({ url, title, du = false }: { url: string; title: string; du?: boolean }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt("Link kopieren:", url);
    }
  };
  const share = async () => {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        return; // cancelled
      }
    }
    await copy();
  };
  const btn = "inline-flex items-center gap-1.5 border-2 border-ink bg-paper px-3 py-1.5 text-sm font-semibold transition hover:bg-ink hover:text-paper";
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="font-display text-lg italic">{du ? "Kennst du jemanden, für den das passt?" : "Kennen Sie jemanden, für den das passt?"}</span>
      <a href={`https://wa.me/?text=${encodeURIComponent(`${title}\n${url}`)}`} target="_blank" rel="noopener noreferrer" className={btn}>
        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-[#25D366]" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.2 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.5-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.8 0-1.4.7-2 1-2.3.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.3 0 .5l-.3.5-.4.4c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.3.1.5.1.6-.1l.9-1c.2-.3.4-.2.6-.1l1.9.9c.3.1.5.2.5.3.1.1.1.6-.1 1.2Z"/></svg>
        WhatsApp
      </a>
      <button type="button" onClick={copy} className={btn}>
        {copied && <Tick className="h-4 w-4 text-accent-500" />}
        <span aria-live="polite">{copied ? "Kopiert" : "Link kopieren"}</span>
      </button>
      <button type="button" onClick={share} className={`${btn} sm:hidden`}>
        Teilen <Arrow className="h-4 w-5" />
      </button>
    </div>
  );
}
