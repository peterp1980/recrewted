"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** Counts active minutes in the customer portal per vacancy (KPI "customer effort"). No content is sent. */
export function PortalActivity() {
  const pathname = usePathname();
  useEffect(() => {
    const vacancyId = pathname.match(/^\/portal\/vacancies\/([0-9a-f-]{36})/)?.[1];
    if (!vacancyId) return;
    const ping = () => {
      if (document.visibilityState === "visible") navigator.sendBeacon?.("/api/t", new Blob([JSON.stringify({ name: "portal_active", vacancyId })], { type: "application/json" }));
    };
    ping();
    const id = setInterval(ping, 60_000);
    return () => clearInterval(id);
  }, [pathname]);
  return null;
}
