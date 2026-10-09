"use client";

import { useEffect } from "react";
import { isAdClick } from "@/lib/acquisition";
import { isFunnelHref } from "@/lib/funnel-links";
import { captureAcquisition } from "@/lib/acquisition-store";
import { capture } from "@/lib/posthog";

/**
 * Root-level hooks for the owner-facing site: everything under the (main)
 * layout, which is the whole funnel an ad click travels — landing, /pricing,
 * signup, dashboard.
 *
 * Two jobs:
 *
 * 1. First-touch acquisition, captured wherever the visitor actually arrives.
 *    Ads may deep-link to /pricing or /signup, so this cannot live on the
 *    landing page alone.
 * 2. One `site_view` per page in PostHog, carrying whether the visit came from
 *    an ad. PostHog's own $pageview does not know that, and "how many of
 *    yesterday's visitors were paid" is the first question of every daily read.
 *
 * Renders nothing. Nothing here may throw: a failed analytics call must never
 * become a user-facing error on the page the ad money just bought.
 */
export function Telemetry() {
  useEffect(() => {
    const acq = captureAcquisition() ?? {};
    capture("site_view", {
      path: window.location.pathname,
      ad: isAdClick(acq),
      utm_source: acq.utm_source ?? null,
      utm_campaign: acq.utm_campaign ?? null,
      referrer: acq.referrer ?? null,
    });

    // CTA clicks by delegation, so the landing page and pricing page stay
    // server components with no handlers of their own. Capture phase, because
    // the link navigates away immediately after.
    const onClick = (e: MouseEvent) => {
      const el = (e.target as Element | null)?.closest?.("a[href]");
      if (!(el instanceof HTMLAnchorElement)) return;
      const href = el.getAttribute("href") ?? "";
      if (!isFunnelHref(href)) return;
      capture("cta_click", {
        href,
        text: (el.textContent ?? "").trim().slice(0, 60),
        from: window.location.pathname,
      });
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return null;
}
