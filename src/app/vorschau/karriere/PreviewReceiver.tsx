"use client";

import { useEffect, useState } from "react";
import { CareerSections, type JobCard } from "@/components/career/CareerSections";
import { sanitizeDocument, type CareerDocument } from "@/lib/careers/document";

export type PreviewPayload = {
  type: "recrewted:career-preview";
  doc: CareerDocument;
  name: string;
  website: string | null;
  color: string | null;
  tone: "sie" | "du";
  jobs: JobCard[];
};

/** Renders what the editor (same origin, parent window) sends. Links are inert in the preview. */
export function PreviewReceiver() {
  const [p, setP] = useState<PreviewPayload | null>(null);
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.data?.type !== "recrewted:career-preview") return;
      setP({ ...(e.data as PreviewPayload), doc: sanitizeDocument(e.data.doc) });
    };
    window.addEventListener("message", onMessage);
    window.parent.postMessage({ type: "recrewted:career-preview-ready" }, window.location.origin);
    return () => window.removeEventListener("message", onMessage);
  }, []);
  if (!p) return null;
  return (
    <div className="[&_a]:pointer-events-none">
      <CareerSections doc={p.doc} name={p.name} website={p.website} color={p.color} tone={p.tone} jobs={p.jobs} preview />
    </div>
  );
}
