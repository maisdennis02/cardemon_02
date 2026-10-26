import "./print.css";
import { formatPrice, headerColors, menuFontFamilies, type Menu, type MenuTheme } from "@/lib/menu";
import { absoluteUrl } from "@/lib/site";
import { PrintButton, PrintQr } from "./print-controls";

export type PrintLabels = {
  save: string;
  help: string;
  footerOrder: string;
  footerNoOrder: string;
  madeWith: string;
};

// The text menu as an A4 sheet the owner saves as PDF or prints (spec
// 2026-10-26): two columns, no photos, theme color only on section titles,
// and on every page a QR to the online menu and the menulala mark.
export function PrintMenu({
  slug,
  name,
  country,
  theme,
  menu,
  hasWhatsapp,
  labels,
}: {
  slug: string;
  name: string;
  country: string | null;
  theme: MenuTheme;
  menu: Menu; // already cut by publicMenu
  hasWhatsapp: boolean;
  labels: PrintLabels;
}) {
  const { title } = headerColors(theme.color);
  const fonts = menuFontFamilies(theme.font);

  return (
    <div className="print-sheet bg-gray-100 text-gray-900 print:bg-white">
      <div className="sticky top-0 z-10 flex flex-col items-center gap-2 bg-white px-4 py-3 text-center shadow print:hidden">
        <PrintButton label={labels.save} />
        <p className="text-xs text-gray-500">{labels.help}</p>
      </div>

      <div
        className="print-flow mx-auto my-4 w-full max-w-[210mm] bg-white px-[14mm] pb-[14mm] pt-[12mm] shadow"
        style={{ fontFamily: fonts.body }}
      >
        <header className="mb-6 text-center">
          {theme.logoUrl && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={theme.logoUrl} alt={name} className="mx-auto mb-2 size-16 rounded-full object-cover" />
          )}
          <h1 className="text-3xl font-bold leading-tight" style={{ fontFamily: fonts.title }}>
            {name}
          </h1>
        </header>

        <main className="columns-2 gap-8">
          {menu.sections.map((section) => (
            <section key={section.id} className="mb-5">
              {section.title && (
                <h2
                  className="print-keep-with-next mb-2 border-b border-gray-300 pb-1 text-lg font-bold"
                  style={{ color: title, fontFamily: fonts.title }}
                >
                  {section.title}
                </h2>
              )}
              <ul>
                {section.items.map((item) => (
                  <li key={item.id} className="mb-2 break-inside-avoid">
                    <div className="flex items-baseline gap-2">
                      <span className="min-w-0 font-bold leading-snug">{item.name}</span>
                      {item.priceCents !== null && (
                        <>
                          <span aria-hidden className="flex-1 border-b border-dotted border-gray-400" />
                          <span className="shrink-0 whitespace-nowrap font-bold tabular-nums">
                            {formatPrice(item.priceCents, country)}
                          </span>
                        </>
                      )}
                    </div>
                    {item.description && (
                      <p className="text-sm leading-snug text-gray-600">{item.description}</p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </main>

        <footer className="print-footer mt-8 flex items-center gap-4 border-t border-gray-300 pt-3">
          <PrintQr value={absoluteUrl(`/m/${slug}`)} />
          <div className="text-sm leading-snug">
            <p className="font-bold">{hasWhatsapp ? labels.footerOrder : labels.footerNoOrder}</p>
            <p className="mt-1 text-xs text-gray-500">
              {labels.madeWith} <span className="font-bold">menulala.com</span>
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
