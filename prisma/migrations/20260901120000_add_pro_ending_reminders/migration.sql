-- Pro-ending reminder emails (see src/lib/pro-ending.ts).
-- IF NOT EXISTS so this stays safe to apply by hand with `prisma db execute`
-- on a database whose migration history was set up with `db push`.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "billingCancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "proEndingReminderSentAt" TIMESTAMP(3);
