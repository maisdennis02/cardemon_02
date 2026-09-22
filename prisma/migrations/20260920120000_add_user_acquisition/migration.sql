-- First-touch ad attribution on the account (see src/lib/acquisition.ts).
-- IF NOT EXISTS so this stays safe to apply by hand with `prisma db execute`
-- on a database whose migration history was set up with `db push`.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "acquisition" JSONB;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "acquiredAt" TIMESTAMP(3);

-- The admin funnel groups signups by source over a date window; without this
-- the daily read sequential-scans User every time it runs.
CREATE INDEX IF NOT EXISTS "User_createdAt_idx" ON "User" ("createdAt");
