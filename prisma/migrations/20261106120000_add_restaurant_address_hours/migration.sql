-- Address and opening hours shown on the menu (docs/superpowers/plans/2026-11-06-cardapio-visual-novo.md).
-- IF NOT EXISTS so this stays safe to apply by hand, more than once.
ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE "Restaurant" ADD COLUMN IF NOT EXISTS "hours" TEXT;
