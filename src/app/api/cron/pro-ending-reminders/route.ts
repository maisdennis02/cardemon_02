import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getDictionary } from "@/i18n";
import { localeForCountry } from "@/i18n/config";
import { sendProEndedEmail, sendProEndingEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { dueReminderStage, endingSoonWhere } from "@/lib/pro-ending";

// GET /api/cron/pro-ending-reminders
// Runs once a day (vercel.json → crons). Emails owners whose Pro plan is
// about to end and will NOT renew — see lib/pro-ending.ts for the rules and
// why auto-renewing subscribers are deliberately left alone.
//
// Cost note: this is the only scheduled DB access in the app. One query a
// day wakes Neon compute once — negligible on the Launch plan — but don't
// add more frequent schedules without pricing them first.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "cron-not-configured" }, { status: 500 });
  }
  // Vercel sends `Authorization: Bearer <CRON_SECRET>` on scheduled runs.
  const auth = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const authorized =
    auth.length === expected.length &&
    timingSafeEqual(Buffer.from(auth), Buffer.from(expected));
  if (!authorized) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const now = new Date();
  const users = await prisma.user.findMany({
    where: endingSoonWhere(now),
    select: {
      id: true,
      email: true,
      proExpiresAt: true,
      proEndingReminderSentAt: true,
      restaurants: { select: { country: true }, take: 1 },
    },
  });

  const sent: { userId: string; stage: number }[] = [];
  for (const u of users) {
    if (!u.proExpiresAt) continue;
    const stage = dueReminderStage(u.proExpiresAt, u.proEndingReminderSentAt, now);
    if (stage === null) continue;

    const locale = localeForCountry(u.restaurants[0]?.country);
    const dict = await getDictionary(locale);
    try {
      const ok =
        stage === 0
          ? await sendProEndedEmail({ to: u.email, dict })
          : await sendProEndingEmail({
              to: u.email,
              dict,
              locale,
              stage,
              expiresAt: u.proExpiresAt,
            });
      if (!ok) continue; // provider rejected it; try again on the next run
      await prisma.user.update({
        where: { id: u.id },
        data: { proEndingReminderSentAt: now },
      });
      sent.push({ userId: u.id, stage });
    } catch (err) {
      // One bad address must not stop the rest of the batch.
      console.error(`[pro-ending] failed for user ${u.id}:`, err);
    }
  }

  return NextResponse.json({ checked: users.length, sent });
}
