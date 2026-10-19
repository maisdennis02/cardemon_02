import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config as loadDotenv } from "dotenv";

loadDotenv();

// Read-only: stored WhatsApp numbers grouped by country, length and prefix,
// plus the rows whose wa.me link is likely wrong (no calling code, or a
// calling code that doesn't match the country).
//
//   npx tsx scripts/whatsapp-numbers.ts
//
// Runs against whatever DATABASE_URL is in the environment — the local one is
// the dev branch; prefix with the prod URL pasted from Neon to check prod.

// Mirrors NATIONAL_LENGTHS in src/lib/whatsapp.ts.
const NATIONAL: Record<string, { lengths: number[]; code: string }> = {
  BR: { lengths: [10, 11], code: "55" },
  MX: { lengths: [10], code: "52" },
  US: { lengths: [10], code: "1" },
};

function problem(country: string | null, n: string): string | null {
  const national = country ? NATIONAL[country] : undefined;
  // Without a country, only a number too short to carry a calling code is suspect.
  if (!national) return !country && n.length <= 11 ? "sem país e sem código do país" : null;
  if (national.lengths.includes(n.length)) return "sem código do país";
  if (!n.startsWith(national.code)) return `não começa com ${national.code}`;
  return null;
}

const mask = (n: string) => n.slice(0, 4) + "•".repeat(Math.max(0, n.length - 6)) + n.slice(-2);

async function main() {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  try {
    const rows = await prisma.restaurant.findMany({
      where: { whatsappNumber: { not: null } },
      select: { slug: true, country: true, whatsappNumber: true },
      orderBy: { slug: "asc" },
    });

    const groups = new Map<string, number>();
    for (const r of rows) {
      const n = r.whatsappNumber!;
      const key = `${r.country ?? "(null)"}\t${n.length}\t${n.slice(0, 2)}`;
      groups.set(key, (groups.get(key) ?? 0) + 1);
    }
    console.log(`${rows.length} restaurantes com WhatsApp\n`);
    console.log("país\tdígitos\tprefixo\tqtd");
    for (const [key, count] of [...groups].sort()) console.log(`${key}\t${count}`);

    const flagged = rows
      .map((r) => ({ ...r, why: problem(r.country, r.whatsappNumber!) }))
      .filter((r) => r.why);
    console.log(`\n${flagged.length} para olhar:`);
    for (const r of flagged) {
      console.log(`  ${r.slug}\t${r.country ?? "(null)"}\t${mask(r.whatsappNumber!)}\t${r.why}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
