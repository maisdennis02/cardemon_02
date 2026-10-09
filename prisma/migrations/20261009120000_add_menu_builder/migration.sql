-- Self-serve menu builder (docs/superpowers/specs/2026-10-09-construtor-de-cardapio-design.md).
-- IF NOT EXISTS so this stays safe to apply by hand, more than once.
ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "menuMode" TEXT NOT NULL DEFAULT 'photos';
ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "menuTheme" JSONB;
ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "menuDraft" JSONB;
ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "menuPublished" JSONB;
