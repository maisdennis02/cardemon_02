import { auth } from "@/auth";

/**
 * Who may read the admin funnel. ADMIN_EMAIL holds one address or a
 * comma-separated list; with it unset there is no admin, and every admin route
 * answers 404 — an unset env var must never open a door.
 *
 * 404 rather than 403 on purpose: a signed-in owner poking at /api/admin/*
 * learns only that the path does not exist.
 */
function adminEmails(): string[] {
  return (process.env.ADMIN_EMAIL ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/** Null when the caller is an admin; the response to return when they are not. */
export async function requireAdmin(): Promise<Response | null> {
  const allowed = adminEmails();
  if (allowed.length === 0) return new Response(null, { status: 404 });
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();
  if (!email || !allowed.includes(email)) return new Response(null, { status: 404 });
  return null;
}

/**
 * "den.roadkill333@gmail.com" → "den***@gmail.com". Enough to tell two owners
 * apart in a report that gets pasted into notes, without carrying the address.
 */
export function maskEmail(email: string | null): string {
  if (!email) return "(sem e-mail)";
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  return `${local.slice(0, 3)}***@${domain}`;
}
