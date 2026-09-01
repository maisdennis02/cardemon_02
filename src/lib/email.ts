import "server-only";
import { Resend } from "resend";
import type { Dictionary, Locale } from "@/i18n";
import { format } from "@/i18n/config";
import { FREE_IMAGE_LIMIT } from "@/lib/pricing";
import { siteUrl } from "@/lib/site";

let cachedClient: Resend | null = null;

function client(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!cachedClient) cachedClient = new Resend(process.env.RESEND_API_KEY);
  return cachedClient;
}

function defaultFrom(): string {
  return process.env.EMAIL_FROM || "menulala <no-reply@menulala.com>";
}

type SendArgs = { to: string; subject: string; html: string };

// Resolves true when the provider accepted the message (or, in dev without a
// key, when it was logged). False on a provider error so callers that track
// "already sent" state don't record a send that never happened.
async function sendEmail({ to, subject, html }: SendArgs): Promise<boolean> {
  const c = client();
  if (!c) {
    // In production, missing RESEND_API_KEY is a misconfiguration — refuse
    // rather than fall back to logging, otherwise password-reset links would
    // leak into Vercel logs.
    if (process.env.NODE_ENV === "production") {
      throw new Error("RESEND_API_KEY is not set in production");
    }
    // Dev: log the email so the reset flow stays usable locally.
    console.warn(
      `[email] RESEND_API_KEY not set — logging instead of sending.\n` +
        `  to=${to}\n  subject=${subject}\n  body=\n${html}`,
    );
    return true;
  }

  const result = await c.emails.send({ from: defaultFrom(), to, subject, html });
  if (result.error) {
    // Don't surface raw provider errors to callers; just log so the action
    // can keep its anti-enumeration "always succeeds" contract.
    console.error("[email] Resend send failed:", result.error);
    return false;
  }
  return true;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// One transactional layout for every email: brand line, greeting, body, a
// single CTA button, optional small-print lines, signature.
function renderEmail({
  subject,
  preheader,
  greeting,
  body,
  cta,
  ctaUrl,
  notes,
  signature,
}: {
  subject: string;
  preheader: string;
  greeting: string;
  body: string;
  cta: string;
  ctaUrl: string;
  notes: string[];
  signature: string;
}): string {
  const brand = "#c84630";
  const navy = "#101522";
  const noteRows = notes
    .map(
      (n) =>
        `        <tr><td style="font-size:13px;line-height:1.6;color:#6b7280;padding-bottom:24px;word-break:break-word;">${escapeHtml(n)}</td></tr>`,
    )
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:#faf7f2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:${navy};">
  <span style="display:none;visibility:hidden;opacity:0;height:0;width:0;overflow:hidden;">${escapeHtml(preheader)}</span>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#faf7f2;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:480px;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;padding:32px;">
        <tr><td style="font-size:14px;font-weight:700;letter-spacing:-0.02em;color:${navy};padding-bottom:24px;">menulala<span style="color:${brand};">.</span></td></tr>
        <tr><td style="font-size:16px;line-height:1.5;color:${navy};padding-bottom:8px;">${escapeHtml(greeting)}</td></tr>
        <tr><td style="font-size:15px;line-height:1.6;color:#4b5563;padding-bottom:24px;">${escapeHtml(body)}</td></tr>
        <tr><td align="left" style="padding-bottom:24px;">
          <a href="${ctaUrl}" style="display:inline-block;background:${brand};color:#ffffff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:9999px;font-size:14px;">${escapeHtml(cta)}</a>
        </td></tr>
${noteRows}
        <tr><td style="font-size:13px;color:#9ca3af;">${escapeHtml(signature)}</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendPasswordResetEmail({
  to,
  dict,
  rawToken,
}: {
  to: string;
  dict: Dictionary;
  rawToken: string;
}): Promise<void> {
  const e = dict.emails.passwordReset;
  const resetUrl = `${siteUrl()}/reset-password?token=${encodeURIComponent(rawToken)}`;
  const html = renderEmail({
    subject: e.subject,
    preheader: e.preheader,
    greeting: e.greeting,
    body: e.body,
    cta: e.cta,
    ctaUrl: resetUrl,
    notes: [resetUrl, e.ignoreNote],
    signature: e.signature,
  });
  await sendEmail({ to, subject: e.subject, html });
}

export async function sendPaymentFailedEmail({
  to,
  dict,
}: {
  to: string;
  dict: Dictionary;
}): Promise<void> {
  const e = dict.emails.paymentFailed;
  // The billing portal route requires a session, so the email points at the
  // dashboard, whose "Manage subscription" button opens the portal.
  const html = renderEmail({
    subject: e.subject,
    preheader: e.preheader,
    greeting: e.greeting,
    body: e.body,
    cta: e.cta,
    ctaUrl: `${siteUrl()}/dashboard`,
    notes: [e.retryNote],
    signature: e.signature,
  });
  await sendEmail({ to, subject: e.subject, html });
}

// Restaurants are local businesses; render the end date in the wall-clock of
// the market the locale serves so "ends on May 20" matches what the Stripe
// receipt and the dashboard say. Non-Brazil markets span time zones, so UTC.
const LOCALE_TIME_ZONE: Record<Locale, string> = {
  "pt-BR": "America/Sao_Paulo",
  es: "UTC",
  en: "UTC",
};

function formatEndDate(date: Date, locale: Locale): string {
  return date.toLocaleDateString(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: LOCALE_TIME_ZONE[locale],
  });
}

// "Pro ends on <date>" (stage 7) / "Pro ends tomorrow" (stage 1). See
// lib/pro-ending.ts for when these go out.
export async function sendProEndingEmail({
  to,
  dict,
  locale,
  stage,
  expiresAt,
}: {
  to: string;
  dict: Dictionary;
  locale: Locale;
  stage: 7 | 1;
  expiresAt: Date;
}): Promise<boolean> {
  const e = dict.emails.proEnding;
  const vars = { date: formatEndDate(expiresAt, locale), freeLimit: FREE_IMAGE_LIMIT };
  const subject = format(stage === 1 ? e.subjectTomorrow : e.subject, vars);
  const html = renderEmail({
    subject,
    preheader: e.preheader,
    greeting: e.greeting,
    body: format(stage === 1 ? e.bodyTomorrow : e.body, vars),
    cta: e.cta,
    // Dashboard → "Manage subscription" opens the Stripe portal, where a
    // cancel-at-period-end subscription has a "Renew" button.
    ctaUrl: `${siteUrl()}/dashboard`,
    notes: [e.renewNote, e.ignoreNote],
    signature: e.signature,
  });
  return sendEmail({ to, subject, html });
}

export async function sendProEndedEmail({
  to,
  dict,
}: {
  to: string;
  dict: Dictionary;
}): Promise<boolean> {
  const e = dict.emails.proEnded;
  const vars = { freeLimit: FREE_IMAGE_LIMIT };
  const html = renderEmail({
    subject: e.subject,
    preheader: e.preheader,
    greeting: e.greeting,
    body: format(e.body, vars),
    cta: e.cta,
    ctaUrl: `${siteUrl()}/pricing`,
    notes: [e.keepNote],
    signature: e.signature,
  });
  return sendEmail({ to, subject: e.subject, html });
}
