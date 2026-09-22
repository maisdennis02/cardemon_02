"use client";

import {
  parseAcquisition,
  type Acquisition,
} from "./acquisition";

/**
 * The browser's copy of first-touch acquisition, kept in localStorage from the
 * first page seen until the dashboard hands it to the server.
 *
 * Why localStorage and not a cookie: the signup can happen minutes later, on
 * /pricing or straight through Google OAuth, and the round trip through
 * Google's consent screen drops anything we did not store ourselves.
 */
const KEY = "menulala:acquisition";

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null; // Private mode or blocked storage.
  }
}

function write(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage unavailable — attribution degrades to this page load only.
  }
}

/** What is already stored for this browser, if anything. */
export function storedAcquisition(): Acquisition | null {
  if (typeof window === "undefined") return null;
  const raw = read(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Acquisition;
  } catch {
    return null;
  }
}

/**
 * Record the current URL as this browser's acquisition, unless one is already
 * stored. First touch wins on purpose: a second visit from a different
 * campaign — or from a Google search for "menulala" after seeing the ad —
 * must not steal credit from the click that actually paid for the visit.
 */
export function captureAcquisition(): Acquisition | null {
  if (typeof window === "undefined") return null;
  const stored = storedAcquisition();
  if (stored) return stored;
  const acq = parseAcquisition(
    window.location.search,
    document.referrer,
    window.location.pathname,
  );
  write(KEY, JSON.stringify(acq));
  return acq;
}

const onceKey = (key: string) => `menulala:once:${key}`;

/** Has `key` already been marked done in this browser? */
export function done(key: string): boolean {
  if (typeof window === "undefined") return true;
  return Boolean(read(onceKey(key)));
}

/** Mark `key` done — for work that should only be marked once it succeeded. */
export function markDone(key: string): void {
  if (typeof window === "undefined") return;
  write(onceKey(key), "1");
}

/**
 * Run `fn` at most once per browser for `key`. The marker is written before
 * the call, so a throw inside does not turn into a retry loop across reloads.
 * Where the work can fail and is worth retrying, use `done` / `markDone`
 * instead and mark it only on success.
 */
export function once(key: string, fn: () => void): void {
  if (done(key)) return;
  markDone(key);
  fn();
}
