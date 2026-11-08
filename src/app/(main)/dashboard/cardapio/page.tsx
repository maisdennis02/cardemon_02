import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getDictionary, getLocale } from "@/i18n";
import { COUNTRY_FOR_LOCALE, LOCALES, type Locale } from "@/i18n/config";
import { isPro } from "@/lib/pricing";
import { MenuSchema, readMenuTheme } from "@/lib/menu";
import { menuRev } from "@/lib/menu-photos";
import { initialBuilderMenu } from "@/lib/menu-edit";
import { MenuBuilder } from "./menu-builder";
import type { GroupTitles } from "./option-groups-editor";
import type { PreviewLabels } from "./step-preview";

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
  // Default option-group titles are menu content too: they follow the country.
  const groupTitles = Object.fromEntries(
    LOCALES.map((l, i) => {
      const e = dictionaries[i].dashboard.builder.editor;
      return [l, { required: e.defaultRequiredTitle, extras: e.defaultExtrasTitle }];
    }),
  ) as Record<Locale, GroupTitles>;
  // The preview is the public menu, whose labels follow the country.
  const previewLabels = Object.fromEntries(
    LOCALES.map((l, i) => {
      const m = dictionaries[i].menu;
      return [l, { cardapioDigital: m.cardapioDigital, madeBy: m.madeBy, fromPrice: m.order.fromPrice }];
    }),
  ) as Record<Locale, PreviewLabels>;

  return (
    <MenuBuilder
      restaurant={{
        id: restaurant.id,
        slug: restaurant.slug,
        name: restaurant.name,
        hasWhatsapp: Boolean(restaurant.whatsappNumber),
        address: restaurant.address,
        hours: restaurant.hours,
      }}
      initialTheme={readMenuTheme(restaurant.menuTheme)}
      initial={initialBuilderMenu(restaurant.menuDraft, restaurant.menuPublished)}
      draftRev={menuRev(MenuSchema.safeParse(restaurant.menuDraft).data ?? null)}
      hasPublished={restaurant.menuPublished != null}
      isPro={isPro(user)}
      sectionSuggestions={sectionSuggestions}
      groupTitles={groupTitles}
      previewLabels={previewLabels}
      defaultCountry={restaurant.country ?? COUNTRY_FOR_LOCALE[locale]}
      hasCountry={restaurant.country != null}
    />
  );
}
