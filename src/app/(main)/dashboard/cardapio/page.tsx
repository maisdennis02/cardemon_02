import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getDictionary, getLocale } from "@/i18n";
import { LOCALES, type Locale } from "@/i18n/config";
import { isPro } from "@/lib/pricing";
import { readMenuTheme } from "@/lib/menu";
import { initialBuilderMenu } from "@/lib/menu-edit";
import { MenuBuilder } from "./menu-builder";

// When the restaurant has no country yet, guess one from the dashboard's
// language; the owner confirms or changes it in the first step.
const COUNTRY_FOR_LOCALE: Record<Locale, string> = { "pt-BR": "BR", es: "MX", en: "US" };

export default async function MenuBuilderPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [restaurant, user, locale] = await Promise.all([
    prisma.restaurant.findFirst({ where: { ownerId: session.user.id } }),
    prisma.user.findUnique({ where: { id: session.user.id }, select: { proExpiresAt: true } }),
    getLocale(),
  ]);
  if (!restaurant) redirect("/dashboard");

  // Section suggestions follow the restaurant's country, which the owner can
  // change on the first step, so all three languages travel to the client.
  const dictionaries = await Promise.all(LOCALES.map((l) => getDictionary(l)));
  const sectionSuggestions = Object.fromEntries(
    LOCALES.map((l, i) => [l, dictionaries[i].dashboard.builder.sectionSuggestions]),
  ) as Record<Locale, string[]>;

  return (
    <MenuBuilder
      restaurant={{ id: restaurant.id, slug: restaurant.slug, name: restaurant.name }}
      initialTheme={readMenuTheme(restaurant.menuTheme)}
      initial={initialBuilderMenu(restaurant.menuDraft, restaurant.menuPublished)}
      hasPublished={restaurant.menuPublished != null}
      isPro={isPro(user)}
      sectionSuggestions={sectionSuggestions}
      defaultCountry={restaurant.country ?? COUNTRY_FOR_LOCALE[locale]}
      hasCountry={restaurant.country != null}
    />
  );
}
