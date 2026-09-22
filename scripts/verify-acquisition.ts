import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config as loadDotenv } from "dotenv";

loadDotenv();

// Read-only: confirm the add_user_acquisition migration landed, and say which
// database it landed in.
//
//   DATABASE_URL='<neon menulala-prod>' npx tsx scripts/verify-acquisition.ts
//
// Worth running before deploying the instrumentation. The generated Prisma
// client selects User.acquisition on every unselected read — Auth.js's
// PrismaAdapter does exactly that — so deploying against a database without
// these columns breaks sign-in for everyone. The usual way to get this wrong is
// to apply the migration to the local dev branch and deploy to prod.

type ColumnRow = { column_name: string; data_type: string };
type IndexRow = { indexname: string };
type CountRow = { n: bigint };
type NewestRow = { newest: Date | null };

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
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'User' AND column_name IN ('acquisition', 'acquiredAt')
      ORDER BY column_name
    `;
    const indexes = await prisma.$queryRaw<IndexRow[]>`
      SELECT indexname FROM pg_indexes
      WHERE tablename = 'User' AND indexname = 'User_createdAt_idx'
    `;

    // Sanity check that this is the real dataset and not an empty dev branch.
    const [{ n }] = await prisma.$queryRaw<CountRow[]>`SELECT count(*)::bigint AS n FROM "User"`;
    const [{ newest }] = await prisma.$queryRaw<NewestRow[]>`
      SELECT max("createdAt") AS newest FROM "User"
    `;

    const found = new Set(columns.map((c) => c.column_name));
    for (const name of ["acquisition", "acquiredAt"]) {
      const col = columns.find((c) => c.column_name === name);
      console.log(`coluna:   ${found.has(name) ? "OK " : "AUSENTE"} ${name}${col ? ` (${col.data_type})` : ""}`);
    }
    console.log(`índice:   ${indexes.length ? "OK " : "AUSENTE"} User_createdAt_idx`);
    console.log(`contas:   ${n} (cadastro mais recente: ${newest?.toISOString() ?? "—"})`);

    const ready = found.size === 2 && indexes.length === 1;
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
