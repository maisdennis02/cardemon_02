import "./built-menu.css";
import { formatPrice, headerColors, type Menu, type MenuTheme } from "@/lib/menu";
import { MenuViewPing } from "./menu-actions";

// Text menu built in the dashboard (spec §2). A server component: the only
// client pieces are the action buttons the page passes in and the view ping.
export function BuiltMenu({
  slug,
  name,
  country,
  theme,
  menu,
  labels,
  actions,
}: {
  slug: string;
  name: string;
  country: string | null;
  theme: MenuTheme;
  menu: Menu; // already cut by visibleMenu
  labels: { cardapioDigital: string; madeBy: string };
  actions: React.ReactNode;
}) {
  const { accent, title } = headerColors(theme.color);
  const band = theme.headerStyle === "band";

  return (
    <div className="flex min-h-dvh flex-col bg-white text-gray-900">
      <MenuViewPing slug={slug} />
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
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
            className={`px-6 font-serif text-3xl font-bold leading-tight ${band && !theme.logoUrl ? "-mt-6" : ""}`}
            style={{ color: title }}
          >
            {name}
          </h1>
          {!band && <div className="mx-auto mt-4 h-0.5 w-16" style={{ background: accent }} />}
        </header>

        <div className="built-menu-actions px-6 pt-5">{actions}</div>

        <main className="flex-1 px-6 pb-10 pt-4">
          {menu.sections.map((section) => (
            <section key={section.id} className="mt-6 first:mt-2">
              {section.title && (
                <h2
                  className="mb-1 border-b pb-1 text-xs font-bold uppercase tracking-widest"
                  style={{ color: title, borderColor: accent }}
                >
                  {section.title}
                </h2>
              )}
              <ul>
                {section.items.map((item) => (
                  <li key={item.id} className="border-b border-gray-100 py-2.5 last:border-b-0">
                    <div className="flex items-baseline gap-3">
                      <span className="flex-1 font-medium">{item.name}</span>
                      {item.priceCents !== null && (
                        <span className="whitespace-nowrap font-bold tabular-nums">
                          {formatPrice(item.priceCents, country)}
                        </span>
                      )}
                    </div>
                    {item.description && <p className="mt-0.5 text-sm text-gray-500">{item.description}</p>}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </main>

        <footer className="px-6 pb-8 text-center text-xs text-gray-400">
          <p>
            {labels.cardapioDigital} · {name}
          </p>
          <p className="mt-1">
            {labels.madeBy}{" "}
            <a href="https://menulala.com/" target="_blank" rel="noopener noreferrer" className="font-bold underline">
              menulala.com
            </a>
          </p>
        </footer>
      </div>
    </div>
  );
}
