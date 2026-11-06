import { readFileSync } from "node:fs";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config as loadDotenv } from "dotenv";
import { ConciergeFileSchema, COURTESY_DAYS, planConciergeFill, type FillPlan } from "@/lib/concierge";

loadDotenv();

// Concierge pilot: put a transcribed menu into the draft of the account the
// restaurant created, and grant 60 days of courtesy Pro. Never publishes.
//
//   DATABASE_URL='<url>' npx tsx scripts/concierge-fill.ts <email> <arquivo.json>           (ensaio)
//   DATABASE_URL='<url>' npx tsx scripts/concierge-fill.ts <email> <arquivo.json> --apply   (grava)
//
// See docs/concierge-runbook.md.

const REASONS: Record<Extract<FillPlan, { ok: false }>["reason"], string> = {
  "no-restaurant": "a conta ainda não tem restaurante (o dono precisa terminar o cadastro de um campo).",
  "many-restaurants": "a conta tem mais de um restaurante; resolva à mão.",
  "draft-not-empty": "o rascunho já tem itens (o dono começou a digitar ou o script já rodou). Nada foi gravado; combine com ele pela DM.",
  "has-subscription": "a conta tem (ou teve) assinatura no Stripe; a cortesia não se aplica. Resolva à mão.",
};

const day = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "—");

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const [email, file] = args.filter((a) => a !== "--apply");
  const url = process.env.DATABASE_URL;
  if (!email || !file) {
    console.error("uso: concierge-fill.ts <email> <arquivo.json> [--apply]");
    process.exit(2);
  }
  if (!url) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  const { host, pathname } = new URL(url);
  console.log(`banco:    ${host}${pathname}`);

  const parsed = ConciergeFileSchema.safeParse(JSON.parse(readFileSync(file, "utf8")));
  if (!parsed.success) {
    console.error(`arquivo inválido em ${file}:\n${parsed.error.message}`);
    process.exit(1);
  }
  const { menu, name, instagram } = parsed.data;

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        proExpiresAt: true,
        billingSubscriptionId: true,
        restaurants: { select: { id: true, slug: true, menuDraft: true } },
      },
    });
    if (!user) {
      console.error(`conta não encontrada: ${email}`);
      process.exit(1);
    }

    const plan = planConciergeFill(user, menu, new Date());
    console.log(`cardápio: ${name} (@${instagram})`);
    if (!plan.ok) {
      console.error(`parado: ${REASONS[plan.reason]}`);
      process.exit(1);
    }
    console.log(`destino:  /m/${plan.slug} (rascunho, não publicado)`);
    console.log(`itens:    ${plan.items} em ${plan.sections} seções`);
    console.log(`pro:      ${day(plan.proExpiresAtBefore)} → ${day(plan.proExpiresAtAfter)} (cortesia de ${COURTESY_DAYS} dias)`);

    if (!apply) {
      console.log("\nensaio: nada gravado. Rode de novo com --apply para gravar.");
      return;
    }
    await prisma.$transaction([
      prisma.restaurant.update({ where: { id: plan.restaurantId }, data: { menuMode: "built", menuDraft: menu } }),
      prisma.user.update({
        where: { id: user.id },
        data: { proExpiresAt: plan.proExpiresAtAfter, proEndingReminderSentAt: null },
      }),
    ]);
    console.log("\ngravado. O dono confere no painel, coloca o WhatsApp e publica.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
