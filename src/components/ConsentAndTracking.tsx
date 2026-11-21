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
    <div role="dialog" aria-modal="false" aria-labelledby="consent-h" className="fixed inset-x-2 bottom-2 z-50 rounded-2xl border border-neutral-200 bg-white p-4 shadow-2xl sm:inset-x-auto sm:right-4 sm:bottom-4 sm:max-w-xl">
      <div className="mx-auto flex max-w-5xl flex-col gap-3">
        <h2 id="consent-h" className="font-semibold">{t.title}</h2>
        <p className="text-sm text-ink/80">{t.text} <a href="/datenschutz" className="underline">{t.privacy}</a></p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => decide(false, false)} className="rounded-lg border border-neutral-300 px-4 py-2 hover:bg-brand-50">{t.necessary}</button>
          <button type="button" onClick={() => decide(true, false)} className="rounded-lg border border-neutral-300 px-4 py-2 hover:bg-brand-50">{t.statistics}</button>
          <button type="button" onClick={() => decide(true, true)} className="btn-primary px-4 py-2">{t.all}</button>
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
