"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { getMessages } from "@/i18n";
import { ATTR_COOKIE, ATTR_DAYS, fromUrl, merge, parseAttribution } from "@/lib/tracking/attribution";
import { BANNER_VERSION, CONSENT_COOKIE, parseConsent, serializeConsent, type Consent } from "@/lib/tracking/consent";

const readCookie = (name: string) => document.cookie.split("; ").find((c) => c.startsWith(`${name}=`))?.slice(name.length + 1);
const writeCookie = (name: string, value: string, days: number) => {
  document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${days * 86400}; Path=/; SameSite=Lax; Secure`;
};
const deleteCookie = (name: string) => (document.cookie = `${name}=; Max-Age=0; Path=/`);

/**
 * Consent banner (F20) and browser-side tracking (F12). The browser reports
 * only entry and page views; everything after the application is server-side.
 */
export function ConsentAndTracking() {
  const t = getMessages().consent;
  const pathname = usePathname();
  const [consent, setConsent] = useState<Consent | null | undefined>(undefined);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const c = parseConsent(readCookie(CONSENT_COOKIE));
    setConsent(c);
    setOpen(!c);
    const reopen = () => setOpen(true);
    window.addEventListener("rc:consent", reopen);
    return () => window.removeEventListener("rc:consent", reopen);
  }, []);

  useEffect(() => {
    if (!consent) return;
    if (consent.marketing) {
      const merged = merge(parseAttribution(readCookie(ATTR_COOKIE)), fromUrl(window.location.search));
      if (merged) writeCookie(ATTR_COOKIE, JSON.stringify(merged), ATTR_DAYS);
    } else {
      deleteCookie(ATTR_COOKIE);
    }
    if (consent.statistics) {
      const job = pathname.match(/^\/jobs\/[^/]*--([0-9a-f-]{36})(\/bewerben)?$/);
      const name = job ? (job[2] ? "apply_start" : "job_view") : "page_view";
      const body = JSON.stringify({ name, vacancyId: job?.[1], path: pathname, search: window.location.search.slice(0, 300) });
      navigator.sendBeacon?.("/api/t", new Blob([body], { type: "application/json" }));
    }
  }, [consent, pathname]);

  const decide = (statistics: boolean, marketing: boolean) => {
    const c: Consent = { version: BANNER_VERSION, statistics: statistics || marketing, marketing, visitorId: consent?.visitorId ?? crypto.randomUUID() };
    writeCookie(CONSENT_COOKIE, serializeConsent(c), 365);
    fetch("/api/consent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(c) }).catch(() => {});
    setConsent(c);
    setOpen(false);
  };

  if (!open) return null;
  return (
    <div role="dialog" aria-modal="false" aria-labelledby="consent-h" className="hard-shadow-pink fixed inset-x-3 bottom-3 z-50 mx-auto max-w-5xl border-2 border-ink bg-paper text-ink">
      <div className="flex flex-col gap-3 px-5 py-4 lg:flex-row lg:items-center lg:gap-8">
        <details className="min-w-0 flex-1 text-sm">
          <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
            <span id="consent-h" className="font-semibold">{t.title}:</span> <span className="text-ink/80">{t.short}</span>{" "}
            <span className="font-medium text-accent-700 underline underline-offset-2">{t.more}</span>
          </summary>
          <p className="mt-2 text-ink/75">{t.text} <a href="/datenschutz" className="underline">{t.privacy}</a></p>
        </details>
        {/* All three choices look the same: no nudging towards consent. */}
        <div className="grid shrink-0 grid-cols-3 gap-2 text-sm font-medium">
          {([[t.necessary, false, false], [t.statistics, true, false], [t.all, true, true]] as const).map(([label, st, mk]) => (
            <button key={label} type="button" onClick={() => decide(st, mk)} className="border-2 border-ink px-3 py-2 text-ink transition hover:bg-ink hover:text-paper">{label}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Footer link that reopens the banner. */
export function ConsentSettingsLink() {
  return (
    <button type="button" onClick={() => window.dispatchEvent(new Event("rc:consent"))} className="hover:text-brand-800">
      {getMessages().consent.settings}
    </button>
  );
}
