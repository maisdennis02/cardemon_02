import Script from "next/script";
import { googleAdsId } from "@/lib/google-ads";

/**
 * Google Ads base tag (gtag.js). Renders nothing unless the build has
 * NEXT_PUBLIC_GOOGLE_ADS_ID — see src/lib/google-ads.ts for the env contract.
 *
 * Mounted in the (main) root layout, which covers the landing page, /pricing,
 * signup and the dashboard. That is deliberate and it is the whole funnel the
 * ad budget pays for: the tag has to run on the page the ad lands on so it can
 * store the click id (gclid) in its first-party cookie, or the conversion
 * fired later on /dashboard has nothing to attribute itself to.
 *
 * It is NOT in the public-menu layout (src/app/m/[slug]/layout.tsx). Menu
 * pages are ISR and must keep working with the database down; they are not
 * part of the ad funnel and have no business loading a third-party script.
 */
export function GoogleAdsTag() {
  if (!googleAdsId) return null;
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${googleAdsId}`} />
      <Script id="google-ads-init">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${googleAdsId}');`}
      </Script>
    </>
  );
}
