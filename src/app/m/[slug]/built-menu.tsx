import "./built-menu.css";
import type { CSSProperties } from "react";
import { POSTER_BG, headerColors, menuFontFamilies, posterColors, type Menu, type MenuTheme } from "@/lib/menu";
import { mapsUrl } from "@/lib/restaurant-info";
import { menuBackgroundStyle } from "@/lib/menu-background";
import { groupInfoLines } from "@/lib/menu-options";
import { MenuViewPing } from "./menu-actions";
import { MENU_SECTION_LIST_CLASS, MENU_SECTION_TITLE_CLASS, MenuItemCard, cardPrice } from "./menu-item-card";
import { OrderableMenu } from "./order/orderable-menu";
import { PhotoItemCard } from "./item-sheet";

// Text menu built in the dashboard (spec §2). No hooks and no "use client":
// the public page renders it on the server, and the builder renders it as a
// live preview (`preview`), which skips the view ping and the full-screen height.
export function BuiltMenu({
  slug,
  name,
  country,
  theme,
  menu,
  labels,
  actions,
  preview = false,
  ordering,
  exampleLabel,
  info,
}: {
  slug: string;
  name: string;
  country: string | null;
  theme: MenuTheme;
  menu: Menu; // already cut: publicMenu on the public page, visibleMenu in the preview
  labels: { cardapioDigital: string; madeBy: string; fromPrice: string };
  actions: React.ReactNode;
  preview?: boolean;
  // Diners can order to this WhatsApp number (spec 2026-10-10). Unset: the
  // page is exactly the static list it was before.
  ordering?: { whatsappNumber: string; demo?: boolean };
  // Set on an example menu: a visible "Example" badge.
  exampleLabel?: string;
  // Address and opening hours, under the name (2026-11-06).
  info?: MenuInfo;
}) {
  const { accent, title } = headerColors(theme.color);
  const fonts = menuFontFamilies(theme.font);
  const poster = theme.style === "poster";
  const titleStyle = sectionTitleStyle(theme);
  const pageStyle = poster ? posterPageStyle(theme.color) : menuBackgroundStyle(theme.background, theme.color);
  // Inside the dashboard, the page already has its own <main>.
  const Main = preview ? "div" : "main";

  return (
    <div
      className={`flex flex-col ${poster ? "menu-poster text-white" : "text-gray-900"} ${preview ? "min-h-0" : "min-h-dvh"} ${ordering ? "pb-24" : ""}`}
      style={{
        fontFamily: fonts.body,
        ...pageStyle,
      }}
    >
      {!preview && <MenuViewPing slug={slug} />}
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
        {exampleLabel && (
          <p className="bg-amber-100 px-4 py-1.5 text-center text-xs font-bold uppercase tracking-wider text-amber-900">
            {exampleLabel}
          </p>
        )}
        <BuiltMenuHeader name={name} theme={theme} info={info} />

        <div className="built-menu-actions px-6 pt-5">{actions}</div>

        <SectionChips menu={menu} accent={accent} background={pageStyle.backgroundColor} />

        {ordering ? (
          <OrderableMenu
            slug={slug}
            restaurantName={name}
            country={country}
            whatsappNumber={ordering.whatsappNumber}
            demo={ordering.demo ?? false}
            menu={menu}
            accent={accent}
            titleColor={title}
            titleStyle={titleStyle}
            controlColor={poster ? posterColors(theme.color).name : accent}
          />
        ) : (
          <Main className="flex-1 px-4 pb-10 pt-3">
            {menu.sections.map((section) => (
              <section key={section.id} id={section.id} className="mt-6 scroll-mt-14 first:mt-1">
                {section.title && (
                  <h2 className={MENU_SECTION_TITLE_CLASS} style={titleStyle}>
                    {section.title}
                  </h2>
                )}
                <ul className={MENU_SECTION_LIST_CLASS}>
                  {section.items.map((item) =>
                    item.photo ? (
                      <PhotoItemCard key={item.id} item={item} country={country} accent={accent} />
                    ) : (
                      <MenuItemCard
                        key={item.id}
                        name={item.name}
                        description={item.description}
                        {...cardPrice(item)}
                        fromTemplate={labels.fromPrice}
                        country={country}
                        groupLines={groupInfoLines(item, country)}
                      />
                    ),
                  )}
                </ul>
              </section>
            ))}
          </Main>
        )}

        <footer className="px-6 pb-8 text-center text-xs text-gray-400">
          <p>
            {labels.cardapioDigital} · {name}
          </p>
          <p className="mt-2">
            {labels.madeBy}{" "}
            {preview ? (
              <span className="font-bold">menulala.com</span>
            ) : (
              <a href="https://menulala.com/" target="_blank" rel="noopener noreferrer" className="font-bold underline">
                menulala.com
              </a>
            )}
          </p>
        </footer>
      </div>
    </div>
  );
}

export type MenuInfo = { address: string | null; hours: string | null };

// A section title's colors: the restaurant's (readable) color on the light
// page; on the poster, a band of the color with legible text on it.
export function sectionTitleStyle(theme: MenuTheme): CSSProperties {
  if (theme.style !== "poster") return { color: headerColors(theme.color).title };
  const { accent, onAccent } = posterColors(theme.color);
  return { background: accent, color: onAccent };
}

// The poster page: near-black, with the colors the stylesheet reads
// (built-menu.css) for item names, the "+" and the band's texture.
function posterPageStyle(color: string): CSSProperties {
  const { accent, name } = posterColors(color);
  return { backgroundColor: POSTER_BG, "--menu-accent": accent, "--menu-name": name } as CSSProperties;
}

const TEXTURE_LINES = 7;
// Enough repeats that even a short name ("Nil's") fills a 512 px band, with
// every other line shifted.
const textureRepeat = (name: string) => Math.max(4, Math.ceil(60 / Math.max(name.length, 1)));

// Also the live preview in the builder's visual step.
export function BuiltMenuHeader({ name, theme, info }: { name: string; theme: MenuTheme; info?: MenuInfo }) {
  const { accent, title } = headerColors(theme.color);
  const band = theme.headerStyle === "band";
  const poster = theme.style === "poster";
  const line = Array.from({ length: textureRepeat(name) }, () => name).join("  ");
  return (
    <header className={band ? "text-center" : "px-6 pt-8 text-center"}>
      {band && (
        <div className="relative mb-12 h-32" style={{ background: poster ? POSTER_BG : accent }}>
          {/* The band says whose menu this is: the name, repeated and tilted,
              like the lettering behind these places' own posters. */}
          <div className="menu-texture absolute inset-0 overflow-hidden" aria-hidden="true">
            <div
              className="absolute -inset-x-16 -top-10 flex -rotate-[8deg] flex-col gap-0.5 whitespace-nowrap text-[34px] uppercase leading-none"
              style={{ fontFamily: "var(--font-menu-poster), Impact, sans-serif", color: poster ? `${accent}40` : "rgba(0,0,0,.13)" }}
            >
              {/* Drawn by the stylesheet from data-text, so the page's text
                  carries the name once, not once per repeat (2026-11-08). */}
              {Array.from({ length: TEXTURE_LINES }, (_, i) => (
                <div key={i} data-text={line} style={i % 2 ? { marginLeft: "-5rem" } : undefined} />
              ))}
            </div>
          </div>
          {theme.logoUrl && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={theme.logoUrl}
              alt={name}
              className="absolute bottom-0 left-1/2 size-20 -translate-x-1/2 translate-y-1/2 rounded-full border-4 bg-white object-cover"
              style={{ borderColor: poster ? accent : "#fff" }}
            />
          )}
        </div>
      )}
      {!band && theme.logoUrl && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={theme.logoUrl} alt={name} className="mx-auto mb-3 size-20 rounded-full object-cover" />
      )}
      <h1
        className={`break-words px-6 font-bold leading-tight ${poster ? "text-4xl" : "text-3xl"} ${band && !theme.logoUrl ? "-mt-6" : ""}`}
        style={
          poster
            ? { color: "#fff", fontFamily: "var(--font-menu-poster), Impact, sans-serif", fontWeight: 400 }
            : { color: title, fontFamily: menuFontFamilies(theme.font).title }
        }
      >
        {name}
      </h1>
      {(info?.address || info?.hours) && (
        <div className={`mt-2 flex flex-col gap-0.5 px-6 text-sm ${poster ? "text-gray-300" : "text-gray-600"}`}>
          {info.address && (
            <a href={mapsUrl(info.address)} target="_blank" rel="noopener noreferrer" className="underline decoration-1 underline-offset-2">
              {info.address}
            </a>
          )}
          {info.hours && <p>{info.hours}</p>}
        </div>
      )}
      {!band && <div className="mx-auto mt-4 h-0.5 w-16" style={{ background: accent }} />}
    </header>
  );
}

// With three or more titled sections, a row of chips that stays at the top
// while the page scrolls, one anchor per section. Plain links: the page has
// no JavaScript to mark the section in view, and it doesn't need any to jump.
export const SECTION_CHIPS_MIN = 3;

export function SectionChips({ menu, accent, background }: { menu: Menu; accent: string; background?: CSSProperties["backgroundColor"] }) {
  const titled = menu.sections.filter((s) => s.title);
  if (titled.length < SECTION_CHIPS_MIN) return null;
  return (
    // The page's own color behind the row while it is stuck at the top, so the
    // items scrolling under it don't show through.
    <nav
      className="section-chips sticky top-0 z-10 flex gap-2 overflow-x-auto px-4 py-2.5"
      style={background ? { backgroundColor: background } : undefined}
    >
      {titled.map((s) => (
        <a
          key={s.id}
          href={`#${s.id}`}
          className="shrink-0 rounded-full border bg-white px-3.5 py-1.5 text-sm font-semibold text-gray-800"
          style={{ borderColor: `${accent}33` }}
        >
          {s.title}
        </a>
      ))}
    </nav>
  );
}
