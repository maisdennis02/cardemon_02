"use client";

import { resetIdentity } from "@/lib/posthog";

/**
 * The sign-out submit button, as a client component only so it can clear the
 * PostHog identity on the way out. Without this, the next person to use a
 * shared restaurant computer would have their session replay filed under the
 * previous owner's e-mail.
 *
 * The form's server action still does the actual sign-out; this only runs
 * first. PostHog is already loaded by the time the dashboard renders, so the
 * reset lands in a microtask — and if the navigation wins the race, the next
 * sign-in re-identifies the browser anyway.
 */
export function SignOutButton({ label, title }: { label: string; title: string }) {
  return (
    <button className="btn btn-ghost btn-sm" title={title} onClick={() => resetIdentity()}>
      {label}
    </button>
  );
}
