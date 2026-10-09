import { notFound } from "next/navigation";
import { MenuSlideshow } from "./slideshow";
import { BuiltMenu } from "./built-menu";
import { MenuActions } from "./menu-actions";
import { getDictionary } from "@/i18n";
import { OG_LOCALE, format, localeForCountry } from "@/i18n/config";
import { absoluteUrl } from "@/lib/site";
import { jsonLdScript } from "@/lib/json-ld";
import { isPro } from "@/lib/pricing";
import {
  countItems,
  effectiveMode,
  isPublished,
  publishedItemCount,
  menuJsonLd,
  readMenuTheme,
  readPublishedMenu,
  visibleMenu,
} from "@/lib/menu";
import { NOINDEX, SITE_NAME, menuDescription, restaurantLd } from "@/lib/seo";
import { getRestaurant } from "./data";

export const revalidate = 60;

// Deliberately empty: menus are generated on first visit and then served from
// the ISR cache. Keeping this DB-free also keeps builds deployable during a
// database outage. Required even when empty — without it the route is fully
// dynamic and `revalidate` is ignored.
export async function generateStaticParams(): Promise<{ slug: string }[]> {
  return [];
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const r = await getRestaurant(slug);
  if (!r) return {};

  const locale = localeForCountry(r.country);
  const t = await getDictionary(locale);
  // An example menu says so in the title and the description, in place of
  // the copy written for real restaurants.
  const title = `${r.name} — ${r.example ? t.menu.exampleLabel : t.menu.cardapioDigital}`;
  const description = r.example
    ? format(t.metadata.exampleMenuDescription, { name: r.name })
    : menuDescription({
        name: r.name,
        description: r.description,
        template: t.metadata.menuDescriptionFallback,
      });
  const path = `/m/${slug}`;
  const cover = r.images[0]?.url;

  return {
    title,
    description,
    alternates: { canonical: path },
    // Out of the index: a menu with nothing published yet (it shows only
    // "being prepared": no photos and no text menu) and the example menus,
    // which are not restaurants and must never rank as one.
    ...((r.example ||
      !isPublished({
        menuMode: r.menuMode,
        imageCount: r.images.length,
        publishedItemCount: publishedItemCount(r.menuPublished),
      })) && { robots: NOINDEX }),
    openGraph: {
      type: "website",
      title,
      description,
      url: path,
      siteName: SITE_NAME,
      locale: OG_LOCALE[locale],
      images: cover ? [{ url: cover }] : undefined,
    },
    twitter: {
      card: cover ? "summary_large_image" : "summary",
      title,
      description,
      images: cover ? [cover] : undefined,
    },
  };
}

export default async function PublicMenuPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const restaurant = await getRestaurant(slug);

  if (!restaurant) notFound();

  // Throws on a corrupt menu on purpose: the failed regeneration keeps the last
  // good copy in the ISR cache instead of replacing it with an empty page.
  const published = readPublishedMenu(restaurant.menuPublished, slug);
  const mode = effectiveMode({
    menuMode: restaurant.menuMode,
    imageCount: restaurant.images.length,
    publishedItemCount: countItems(published),
  });
  const visible =
    mode === "built" && published ? visibleMenu(published, isPro(restaurant.owner)).menu : null;

  // No Restaurant structured data for an example: it would tell search
  // engines that a business exists at this URL. A text menu goes in as a
  // schema.org Menu, with only the items the page shows.
  const url = absoluteUrl(`/m/${slug}`);
  const ld = restaurant.example
    ? null
    : { ...restaurantLd(restaurant, url), hasMenu: visible ? menuJsonLd(visible, restaurant.country) : url };

  const deliveryUrls = {
    ifoodUrl: restaurant.ifoodUrl,
    ubereatsUrl: restaurant.ubereatsUrl,
    doordashUrl: restaurant.doordashUrl,
    rappiUrl: restaurant.rappiUrl,
    grubhubUrl: restaurant.grubhubUrl,
    pedidosyaUrl: restaurant.pedidosyaUrl,
    didifoodUrl: restaurant.didifoodUrl,
  };
  const t = await getDictionary(localeForCountry(restaurant.country));

  return (
    <>
      {ld && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdScript(ld) }}
        />
      )}
      {visible ? (
        <BuiltMenu
          slug={slug}
          name={restaurant.name}
          country={restaurant.country}
          theme={readMenuTheme(restaurant.menuTheme)}
          menu={visible}
          labels={{ cardapioDigital: t.menu.cardapioDigital, madeBy: t.menu.madeBy }}
          // An example has no WhatsApp: its cart runs in demo mode and shows
          // the message instead of sending it.
          ordering={
            restaurant.whatsappNumber
              ? { whatsappNumber: restaurant.whatsappNumber }
              : restaurant.example
                ? { whatsappNumber: "", demo: true }
                : undefined
          }
          exampleLabel={restaurant.example ? t.menu.exampleLabel : undefined}
          actions={
            <MenuActions
              slug={slug}
              whatsappNumber={restaurant.whatsappNumber}
              instagramUrl={restaurant.instagramUrl}
              country={restaurant.country}
              deliveryUrls={deliveryUrls}
            />
          }
        />
      ) : (
        <MenuSlideshow
          slug={slug}
          example={restaurant.example}
          name={restaurant.name}
          whatsappNumber={restaurant.whatsappNumber}
          instagramUrl={restaurant.instagramUrl}
          country={restaurant.country}
          deliveryUrls={deliveryUrls}
          images={restaurant.images.map((i) => i.url)}
        />
      )}
    </>
  );
}
