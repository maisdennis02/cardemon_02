/**
 * Where a visitor came from, captured once from the first URL they land on
 * and carried until an account exists to attach it to.
 *
 * Shared by the browser (src/components/telemetry.tsx stores it in
 * localStorage) and the server (src/app/api/attribution/route.ts validates it
 * before writing User.acquisition), so the shape can only be wrong in one
 * place.
 *
 * gclid/gbraid/wbraid are Google's ad-click ids. Keeping them is what lets us
 * later upload "published a menu" back to Google Ads as an offline conversion,
 * so the bidding learns from restaurants that actually go live rather than
 * from e-mail addresses.
 */
export const ACQUISITION_PARAMS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "gclid",
  "gbraid",
  "wbraid",
] as const;

export type Acquisition = Partial<
  Record<(typeof ACQUISITION_PARAMS)[number], string>
> & {
  /** Path of the first page seen, e.g. "/" or "/pricing". */
  landing?: string;
  /** Referrer host, when the browser shared one. */
  referrer?: string;
  /** ISO time of the first visit. */
  at?: string;
};

export const MAX_ACQUISITION_VALUE = 200;

/**
 * Pull the acquisition fields out of a landing URL. Pure, so it is testable
 * and safe on the server; telemetry.tsx is what reads window.location.
 */
export function parseAcquisition(
  search: string,
  referrer: string,
  path: string,
  now: Date = new Date(),
): Acquisition {
  const params = new URLSearchParams(search);
  const acq: Acquisition = {
    landing: path.slice(0, MAX_ACQUISITION_VALUE),
    at: now.toISOString(),
  };
  for (const key of ACQUISITION_PARAMS) {
    const value = params.get(key)?.trim();
    if (value) acq[key] = value.slice(0, MAX_ACQUISITION_VALUE);
  }
  if (referrer) {
    try {
      const host = new URL(referrer).host;
      if (host) acq.referrer = host.slice(0, 100);
    } catch {
      // A malformed referrer tells us nothing worth keeping.
    }
  }
  return acq;
}

/** True when this visit carries a Google ad click — the only paid-traffic proof. */
export function isAdClick(acq: Acquisition | null | undefined): boolean {
  return Boolean(acq && (acq.gclid || acq.gbraid || acq.wbraid));
}

/**
 * Where a signup came from, in one word, for grouping in the daily read. A
 * Google click id with no UTM still means "google-ads": Google's auto-tagging
 * sets gclid and nothing else unless the campaign URL adds UTMs by hand.
 */
export function acquisitionSource(acq: Acquisition | null | undefined): string {
  if (!acq) return "(unknown)";
  if (isAdClick(acq)) return "google-ads";
  if (acq.utm_source) return acq.utm_source.toLowerCase();
  if (acq.referrer) return acq.referrer.replace(/^www\./, "");
  return "(direct)";
}

/**
 * Narrow a value read back out of the `Json?` column. Prisma hands it to us as
 * `unknown`-ish JSON, and a row written before this shape existed could be
 * anything at all.
 */
export function asAcquisition(value: unknown): Acquisition | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Acquisition;
}
