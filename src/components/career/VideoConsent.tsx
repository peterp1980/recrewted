"use client";

import { useState } from "react";
import { Play } from "lucide-react";

/**
 * Two-click video: nothing is loaded from YouTube until the visitor clicks.
 * Then the privacy-enhanced embed (youtube-nocookie.com) is used.
 */
export function VideoConsent({ id, title, note }: { id: string; title: string; note: string }) {
  const [on, setOn] = useState(false);
  if (on) {
    return (
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
        title={title || "Video"}
        allow="autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
        className="aspect-video w-full rounded-3xl"
      />
    );
  }
  return (
    <button
      type="button"
      onClick={() => setOn(true)}
      className="group flex aspect-video w-full flex-col items-center justify-center gap-4 rounded-3xl bg-ink p-6 text-center text-white"
    >
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--c)] text-[var(--c-fg)] transition group-hover:scale-110">
        <Play className="h-7 w-7" aria-hidden="true" />
      </span>
      <span className="font-semibold">{title || "Video abspielen"}</span>
      <span className="max-w-md text-sm text-white/70">{note}</span>
    </button>
  );
}
