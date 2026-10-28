import { formatPrice, headerColors, menuFontFamilies, type Menu, type MenuItem, type MenuTheme } from "@/lib/menu";
import { menuBackgroundStyle } from "@/lib/menu-background";
import { PrintQr } from "./print-controls";
import { SHEET, columnWidth } from "./print-layout";

// One A4 sheet of the printable menu, in the "lanchonete" look the owner
// picked on 28/10 over the phone cards: a colored band with the logo and the
// name, section titles in pills, the items of a section in one white block
// with dashed dividers, the price in the theme color. Laid out by
// print-layout; no hooks, so it is the same markup on screen, in the PDF and
// in the JPG.

export type PrintBlock =
  | { kind: "title"; key: string; title: string }
  | { kind: "item"; key: string; section: string; item: MenuItem };

export function menuBlocks(menu: Menu): PrintBlock[] {
  return menu.sections.flatMap((s) => [
    ...(s.title ? [{ kind: "title" as const, key: s.id, title: s.title }] : []),
    ...s.items.map((item) => ({ kind: "item" as const, key: item.id, section: s.id, item })),
  ]);
}

// The page measures each block with its margins; items carry none, so the
// rows of a section stack into one block.
export function PrintTitle({ title, accent, titleFont }: { title: string; accent: string; titleFont: string }) {
  return (
    <h2
      data-print="pill"
      className="mb-2 mt-5 self-start rounded-full px-3.5 py-1 text-[1.05em] font-bold uppercase leading-tight tracking-wider text-white"
      style={{ background: accent, fontFamily: titleFont }}
    >
      {title}
    </h2>
  );
}

export function PrintItemRow({ item, country, priceColor }: { item: MenuItem; country: string | null; priceColor: string }) {
  return (
    <div className="flex items-center gap-2.5 border-b border-dashed border-gray-300 px-3.5 py-2 last:border-b-0">
      {item.photo && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={item.photo.thumb} alt="" width={44} height={44} className="size-11 shrink-0 rounded-lg object-cover" />
      )}
      <div className="min-w-0 flex-1">
        <p className="font-bold leading-snug">{item.name}</p>
        {item.description && <p className="mt-0.5 text-[0.8em] leading-snug text-gray-500">{item.description}</p>}
      </div>
      {item.priceCents !== null && (
        <span className="shrink-0 whitespace-nowrap font-extrabold tabular-nums" style={{ color: priceColor }}>
          {formatPrice(item.priceCents, country)}
        </span>
      )}
    </div>
  );
}

// Sheet 1's header: the band, the logo on it, the name in white.
export function PrintBand({ name, theme, kicker }: { name: string; theme: MenuTheme; kicker: string }) {
  const { accent } = headerColors(theme.color);
  const fonts = menuFontFamilies(theme.font);
  return (
    <div data-print="band" className="flex items-center gap-5 px-10 py-7 text-white" style={{ background: accent }}>
      {theme.logoUrl && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={theme.logoUrl} alt={name} className="size-24 shrink-0 rounded-full border-4 border-white bg-white object-cover" />
      )}
      <div className="min-w-0">
        <p className="text-[44px] font-extrabold leading-tight" style={{ fontFamily: fonts.title }}>
          {name}
        </p>
        <p className="mt-3 text-sm uppercase tracking-[0.12em] opacity-90">{kicker}</p>
      </div>
    </div>
  );
}

// A column's blocks as drawn: a title alone, a run of items of one section
// in one white block.
type Group = { kind: "title"; key: string; title: string } | { kind: "box"; key: string; items: MenuItem[] };

function groups(column: PrintBlock[]): Group[] {
  const out: Group[] = [];
  let section: string | null = null;
  for (const b of column) {
    if (b.kind === "title") {
      out.push(b);
      section = null;
      continue;
    }
    const last = out.at(-1);
    if (last?.kind === "box" && section === b.section) last.items.push(b.item);
    else out.push({ kind: "box", key: b.key, items: [b.item] });
    section = b.section;
  }
  return out;
}

export function PrintSheet({
  index,
  total,
  name,
  theme,
  kicker,
  country,
  columns,
  scale,
  blocks,
  footer,
}: {
  index: number;
  total: number;
  name: string;
  theme: MenuTheme;
  kicker: string;
  country: string | null;
  columns: 1 | 2;
  scale: number;
  blocks: PrintBlock[][]; // per column
  footer: { qrValue: string; line: string; madeWith: string };
}) {
  const { accent, title } = headerColors(theme.color);
  const fonts = menuFontFamilies(theme.font);
  const width = columnWidth(columns);

  return (
    <div
      className="print-page relative overflow-hidden text-gray-900"
      style={{
        width: SHEET.width,
        height: SHEET.height,
        fontFamily: fonts.body,
        ...menuBackgroundStyle(theme.background, theme.color),
      }}
      aria-label={`${index + 1} / ${total}`}
    >
      {index === 0 ? (
        <PrintBand name={name} theme={theme} kicker={kicker} />
      ) : (
        <p
          data-print="strip"
          className="flex items-center px-10 text-lg font-bold text-white"
          style={{ height: SHEET.strip, background: accent, fontFamily: fonts.title }}
        >
          {name}
        </p>
      )}

      <div className="flex justify-center pt-5" style={{ gap: SHEET.gap, paddingInline: SHEET.pad }}>
        {blocks.map((column, c) => (
          <div key={c} className="flex flex-col" style={{ width: width / scale, zoom: scale }}>
            {groups(column).map((g) =>
              g.kind === "title" ? (
                <PrintTitle key={g.key} title={g.title} accent={accent} titleFont={fonts.title} />
              ) : (
                <div key={g.key} data-print="box" className="overflow-hidden rounded-2xl bg-white">
                  {g.items.map((item) => (
                    <PrintItemRow key={item.id} item={item} country={country} priceColor={title} />
                  ))}
                </div>
              ),
            )}
          </div>
        ))}
      </div>

      <footer
        className="absolute flex flex-row-reverse items-center gap-3.5 border-t border-black/10 pt-3 text-right"
        style={{ left: SHEET.pad, right: SHEET.pad, bottom: 22 }}
      >
        <div className="shrink-0 bg-white p-1">
          <PrintQr value={footer.qrValue} />
        </div>
        <div className="text-sm leading-snug">
          <p className="font-bold">{footer.line}</p>
          <p className="mt-2 text-xs text-gray-500">
            {footer.madeWith} <span className="font-bold">menulala.com</span>
          </p>
        </div>
      </footer>
    </div>
  );
}
