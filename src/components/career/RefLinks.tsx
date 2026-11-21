"use client";

import { useEffect } from "react";
import { REF_PARAM, refParam, withRef } from "@/lib/referrals/code";

/**
 * The career page is cached for everyone, so the referral code from the URL is added to the
 * job links in the browser. No cookie, nothing stored.
 */
export function RefLinks() {
  useEffect(() => {
    const ref = refParam(new URLSearchParams(window.location.search).get(REF_PARAM));
    if (!ref) return;
    document.querySelectorAll<HTMLAnchorElement>('a[href^="/jobs/"]').forEach((a) => {
      a.setAttribute("href", withRef(a.getAttribute("href") ?? "", ref));
    });
  }, []);
  return null;
}
