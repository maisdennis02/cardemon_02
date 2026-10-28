import "./built-menu.css";
import { headerColors, menuFontFamilies, type Menu, type MenuTheme } from "@/lib/menu";
import { menuBackgroundStyle } from "@/lib/menu-background";
import { MenuViewPing } from "./menu-actions";
import { MENU_SECTION_LIST_CLASS, MENU_SECTION_TITLE_CLASS, MenuItemCard } from "./menu-item-card";
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
}: {
  slug: string;
  name: string;
  country: string | null;
  theme: MenuTheme;
  menu: Menu; // already cut: publicMenu on the public page, visibleMenu in the preview
  labels: { cardapioDigital: string; madeBy: string };
  actions: React.ReactNode;
  preview?: boolean;
  // Diners can order to this WhatsApp number (spec 2026-10-10). Unset: the
  // page is exactly the static list it was before.
  ordering?: { whatsappNumber: string; demo?: boolean };
  // Set on an example menu: a visible "Example" badge.
  exampleLabel?: string;
}) {
  const { accent, title } = headerColors(theme.color);
  const fonts = menuFontFamilies(theme.font);
  // Inside the dashboard, the page already has its own <main>.
  const Main = preview ? "div" : "main";

  return (
    <div
      className={`flex flex-col text-gray-900 ${preview ? "min-h-0" : "min-h-dvh"} ${ordering ? "pb-24" : ""}`}
      style={{ fontFamily: fonts.body, ...menuBackgroundStyle(theme.background, theme.color) }}
    >
      {!preview && <MenuViewPing slug={slug} />}
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
        {exampleLabel && (
          <p className="bg-amber-100 px-4 py-1.5 text-center text-xs font-bold uppercase tracking-wider text-amber-900">
            {exampleLabel}
          </p>
        )}
        <BuiltMenuHeader name={name} theme={theme} />

        <div className="built-menu-actions px-6 pt-5">{actions}</div>

        <SectionChips menu={menu} accent={accent} />

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
          />
        ) : (
          <Main className="flex-1 px-4 pb-10 pt-3">
            {menu.sections.map((section) => (
              <section key={section.id} id={section.id} className="mt-6 scroll-mt-14 first:mt-1">
                {section.title && (
                  <h2 className={MENU_SECTION_TITLE_CLASS} style={{ color: title }}>
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
                        priceCents={item.priceCents}
                        country={country}
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

// Also the live preview in the builder's visual step.
export function BuiltMenuHeader({ name, theme }: { name: string; theme: MenuTheme }) {
  const { accent, title } = headerColors(theme.color);
  const band = theme.headerStyle === "band";
  return (
    <header className={band ? "text-center" : "px-6 pt-8 text-center"}>
      {band && (
        <div className="relative mb-12 h-24" style={{ background: accent }}>
          {theme.logoUrl && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={theme.logoUrl}
              alt={name}
              className="absolute bottom-0 left-1/2 size-20 -translate-x-1/2 translate-y-1/2 rounded-full border-4 border-white bg-white object-cover"
            />
          )}
        </div>
      )}
      {!band && theme.logoUrl && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={theme.logoUrl} alt={name} className="mx-auto mb-3 size-20 rounded-full object-cover" />
      )}
      <h1
        className={`px-6 text-3xl font-bold leading-tight ${band && !theme.logoUrl ? "-mt-6" : ""}`}
        style={{ color: title, fontFamily: menuFontFamilies(theme.font).title }}
      >
        {name}
      </h1>
      {!band && <div className="mx-auto mt-4 h-0.5 w-16" style={{ background: accent }} />}
    </header>
  );
}

// With three or more titled sections, a row of chips that stays at the top
// while the page scrolls, one anchor per section. Plain links: the page has
// no JavaScript to mark the section in view, and it doesn't need any to jump.
export const SECTION_CHIPS_MIN = 3;

export function SectionChips({ menu, accent }: { menu: Menu; accent: string }) {
  const titled = menu.sections.filter((s) => s.title);
  if (titled.length < SECTION_CHIPS_MIN) return null;
  return (
    <nav className="section-chips sticky top-0 z-10 flex gap-2 overflow-x-auto px-4 py-2.5">
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
