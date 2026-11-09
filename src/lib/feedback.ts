import { maskEmail } from "@/lib/admin";

/**
 * "Sugestões e dúvidas" — the box on the dashboard where a restaurant writes
 * to us. Pure pieces only (no DB, no e-mail client) so they can be tested as
 * is; the server action and the admin route wire them up.
 */

export { FEEDBACK_MAX_LENGTH } from "@/lib/feedback-limits";
import { FEEDBACK_MAX_LENGTH } from "@/lib/feedback-limits";

export type ParsedFeedback =
  | { ok: true; message: string }
  | { ok: false; error: "empty" | "too_long" };

export function parseFeedbackMessage(raw: unknown): ParsedFeedback {
  const message = typeof raw === "string" ? raw.trim() : "";
  if (!message) return { ok: false, error: "empty" };
  if (message.length > FEEDBACK_MAX_LENGTH) return { ok: false, error: "too_long" };
  return { ok: true, message };
}

export type FeedbackRestaurantContext = {
  name: string;
  slug: string;
  menuMode: string;
  items: number;
  hasWhatsapp: boolean;
};

export type FeedbackEmail = { subject: string; html: string; replyTo: string };

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * The internal e-mail to contato@. Plain and dense on purpose: it is read by
 * the owner, not by a customer, and it must carry everything they would
 * otherwise have to ask the restaurant ("qual é o seu restaurante mesmo?").
 */
export function buildFeedbackEmail({
  message,
  fromEmail,
  locale,
  restaurant,
}: {
  message: string;
  fromEmail: string;
  locale: string;
  restaurant: FeedbackRestaurantContext | null;
}): FeedbackEmail {
  const who = restaurant ? restaurant.name : fromEmail;
  const subject = `[menulala] ${who}: sugestão/dúvida`;
  const rows: [string, string][] = [
    ["De", fromEmail],
    ["Locale", locale],
    ...(restaurant
      ? ([
          ["Restaurante", `${restaurant.name} (/m/${restaurant.slug})`],
          ["Cardápio", `${restaurant.menuMode}, ${restaurant.items} itens`],
          ["WhatsApp", restaurant.hasWhatsapp ? "cadastrado" : "não cadastrado"],
        ] as [string, string][])
      : ([["Restaurante", "sem restaurante ainda"]] as [string, string][])),
  ];
  const context = rows
    .map(([k, v]) => `<tr><td style="color:#6b7280;padding:2px 12px 2px 0;">${escapeHtml(k)}</td><td>${escapeHtml(v)}</td></tr>`)
    .join("\n");
  const body = escapeHtml(message).replace(/\r?\n/g, "<br>");
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:24px;background:#faf7f2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#101522;">
  <p style="font-size:14px;font-weight:700;margin:0 0 16px;">menulala — sugestão/dúvida de um restaurante</p>
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="font-size:14px;margin-bottom:16px;">
${context}
  </table>
  <div style="font-size:15px;line-height:1.6;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:16px;white-space:normal;">${body}</div>
  <p style="font-size:13px;color:#6b7280;margin:16px 0 0;">Responda este e-mail para falar direto com o restaurante.</p>
</body>
</html>`;
  return { subject, html, replyTo: fromEmail };
}

/** One stored message plus what the admin route needs to show it. */
export type FeedbackRow = {
  id: string;
  createdAt: Date;
  answeredAt: Date | null;
  message: string;
  locale: string;
  email: string | null;
  restaurant: { name: string; slug: string } | null;
};

export type FeedbackItem = {
  id: string;
  createdAt: string;
  answeredAt: string | null;
  waitingDays: number;
  message: string;
  locale: string;
  email: string;
  restaurant: { name: string; slug: string } | null;
};

export type FeedbackReport = {
  totals: { pending: number; answered: number };
  pending: FeedbackItem[];
  answered: FeedbackItem[];
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** Pending first and oldest first: that is the order they get answered in. */
export function shapeFeedback(rows: FeedbackRow[], now: Date): FeedbackReport {
  const toItem = (r: FeedbackRow): FeedbackItem => ({
    id: r.id,
    createdAt: r.createdAt.toISOString(),
    answeredAt: r.answeredAt ? r.answeredAt.toISOString() : null,
    waitingDays: Math.floor(((r.answeredAt ?? now).getTime() - r.createdAt.getTime()) / DAY_MS),
    message: r.message,
    locale: r.locale,
    email: maskEmail(r.email),
    restaurant: r.restaurant,
  });
  const byOldest = (a: FeedbackRow, b: FeedbackRow) => a.createdAt.getTime() - b.createdAt.getTime();
  const byNewest = (a: FeedbackRow, b: FeedbackRow) => b.createdAt.getTime() - a.createdAt.getTime();
  const pending = rows.filter((r) => !r.answeredAt).sort(byOldest).map(toItem);
  const answered = rows.filter((r) => r.answeredAt).sort(byNewest).map(toItem);
  return { totals: { pending: pending.length, answered: answered.length }, pending, answered };
}
