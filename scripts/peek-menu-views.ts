import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config as loadDotenv } from "dotenv";

loadDotenv();

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });
  try {
    const grouped = await prisma.menuView.groupBy({
      by: ["kind"],
      _count: { _all: true },
      orderBy: { kind: "asc" },
    });
    console.log("MenuView rows by kind:");
    for (const row of grouped) {
      console.log(`  ${row.kind.padEnd(20)} ${row._count._all}`);
    }
    if (grouped.length === 0) console.log("  (none)");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
