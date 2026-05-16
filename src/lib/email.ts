import "server-only";
import { Resend } from "resend";
import type { Dictionary } from "@/i18n";
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

async function sendEmail({ to, subject, html }: SendArgs): Promise<void> {
  const c = client();
  if (!c) {
    // In dev (or any env without RESEND_API_KEY) we log the email instead of
    // sending so the reset flow stays usable.
    console.warn(
      `[email] RESEND_API_KEY not set — logging instead of sending.\n` +
        `  to=${to}\n  subject=${subject}\n  body=\n${html}`,
    );
    return;
  }

  const result = await c.emails.send({ from: defaultFrom(), to, subject, html });
  if (result.error) {
    // Don't surface raw provider errors to callers; just log so the action
    // can keep its anti-enumeration "always succeeds" contract.
    console.error("[email] Resend send failed:", result.error);
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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
  const brand = "#c84630";
  const navy = "#101522";

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>${escapeHtml(e.subject)}</title></head>
<body style="margin:0;padding:0;background:#faf7f2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:${navy};">
  <span style="display:none;visibility:hidden;opacity:0;height:0;width:0;overflow:hidden;">${escapeHtml(e.preheader)}</span>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#faf7f2;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:480px;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;padding:32px;">
        <tr><td style="font-size:14px;font-weight:700;letter-spacing:-0.02em;color:${navy};padding-bottom:24px;">menulala<span style="color:${brand};">.</span></td></tr>
        <tr><td style="font-size:16px;line-height:1.5;color:${navy};padding-bottom:8px;">${escapeHtml(e.greeting)}</td></tr>
        <tr><td style="font-size:15px;line-height:1.6;color:#4b5563;padding-bottom:24px;">${escapeHtml(e.body)}</td></tr>
        <tr><td align="left" style="padding-bottom:24px;">
          <a href="${resetUrl}" style="display:inline-block;background:${brand};color:#ffffff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:9999px;font-size:14px;">${escapeHtml(e.cta)}</a>
        </td></tr>
        <tr><td style="font-size:13px;line-height:1.6;color:#6b7280;padding-bottom:24px;word-break:break-all;">${escapeHtml(resetUrl)}</td></tr>
        <tr><td style="font-size:13px;line-height:1.6;color:#6b7280;padding-bottom:24px;">${escapeHtml(e.ignoreNote)}</td></tr>
        <tr><td style="font-size:13px;color:#9ca3af;">${escapeHtml(e.signature)}</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  await sendEmail({ to, subject: e.subject, html });
}
