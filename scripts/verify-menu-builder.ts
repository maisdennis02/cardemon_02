import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config as loadDotenv } from "dotenv";

loadDotenv();

// Read-only: confirm the add_menu_builder migration landed, and say which
// database it landed in.
//
//   DATABASE_URL='<neon menulala-prod>' npx tsx scripts/verify-menu-builder.ts
//
// Run it before deploying the menu builder. The generated Prisma client selects
// the new Restaurant columns on every unselected read, so deploying against a
// database without them breaks the dashboard and every public menu that isn't
// already in the ISR cache. The usual way to get this wrong is to apply the
// migration to the local dev branch and deploy to prod.

type ColumnRow = { column_name: string; data_type: string; column_default: string | null };
type CountRow = { total: bigint; built: bigint };

const EXPECTED: Record<string, string> = {
  menuMode: "text",
  menuTheme: "jsonb",
  menuDraft: "jsonb",
  menuPublished: "jsonb",
};

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }

  // Never print the password: show only where this is pointing.
  const { host, pathname } = new URL(url);
  console.log(`banco:    ${host}${pathname}`);

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  try {
    const columns = await prisma.$queryRaw<ColumnRow[]>`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'Restaurant'
        AND column_name IN ('menuMode', 'menuTheme', 'menuDraft', 'menuPublished')
    `;

    let ready = true;
    for (const [name, type] of Object.entries(EXPECTED)) {
      const col = columns.find((c) => c.column_name === name);
      const ok = col?.data_type === type;
      if (!ok) ready = false;
      console.log(`coluna:   ${ok ? "OK " : "AUSENTE"} ${name}${col ? ` (${col.data_type})` : ""}`);
    }

    const mode = columns.find((c) => c.column_name === "menuMode");
    const defaultOk = mode?.column_default?.includes("'photos'") ?? false;
    if (!defaultOk) ready = false;
    console.log(`padrão:   ${defaultOk ? "OK " : "ERRADO"} menuMode = ${mode?.column_default ?? "—"}`);

    // Sanity check that this is the real dataset and not an empty dev branch.
    if (mode) {
      const [{ total, built }] = await prisma.$queryRaw<CountRow[]>`
        SELECT count(*)::bigint AS total,
               count(*) FILTER (WHERE "menuMode" <> 'photos')::bigint AS built
        FROM "Restaurant"
      `;
      console.log(`restaurantes: ${total} (fora do modo fotos: ${built})`);
    }

    console.log(ready ? "\nPronto para deploy." : "\nNÃO faça deploy: rode a migração neste banco antes.");
    process.exit(ready ? 0 : 1);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
