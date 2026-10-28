import { headerColors, menuFontFamilies, type Menu, type MenuItem, type MenuTheme } from "@/lib/menu";
import { menuBackgroundStyle } from "@/lib/menu-background";
import { BuiltMenuHeader } from "../built-menu";
import { MENU_SECTION_TITLE_CLASS, MenuItemCard } from "../menu-item-card";
import { PrintQr } from "./print-controls";
import { SHEET, columnWidth } from "./print-layout";

// One A4 sheet of the printable menu (spec 2026-10-28 §1): the phone menu's
// header, background and cards, laid out by print-layout. No hooks: the
// sheet is the same markup on screen, in the PDF and in the JPG.

export type PrintBlock =
  | { kind: "title"; key: string; title: string }
  | { kind: "item"; key: string; item: MenuItem };

// Space between two blocks of a column; the page adds it to each measured height.
export const BLOCK_GAP = 6;

export function menuBlocks(menu: Menu): PrintBlock[] {
  return menu.sections.flatMap((s) => [
    ...(s.title ? [{ kind: "title" as const, key: s.id, title: s.title }] : []),
    ...s.items.map((item) => ({ kind: "item" as const, key: item.id, item })),
  ]);
}

export function PrintBlockView({
  block,
  country,
  titleColor,
  titleFont,
}: {
  block: PrintBlock;
  country: string | null;
  titleColor: string;
  titleFont: string;
}) {
  if (block.kind === "title") {
    // pt-2: a title sits further from the card above than from its own cards.
    return (
      <h2 className={`${MENU_SECTION_TITLE_CLASS} !mb-0 pt-2`} style={{ color: titleColor, fontFamily: titleFont }}>
        {block.title}
      </h2>
    );
  }
  const { item } = block;
  return (
    <ul>
      <MenuItemCard
        name={item.name}
        description={item.description}
        priceCents={item.priceCents}
        country={country}
        photo={item.photo}
        compact
      />
    </ul>
  );
}

export function PrintSheet({
  index,
  total,
  name,
  theme,
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
  country: string | null;
  columns: 1 | 2;
  scale: number;
  blocks: PrintBlock[][]; // per column
  footer: { qrValue: string; line: string; madeWith: string };
}) {
  const { title } = headerColors(theme.color);
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
        <div className="pb-4">
          <BuiltMenuHeader name={name} theme={theme} print />
        </div>
      ) : (
        <p
          className="mx-9 flex items-end justify-center border-b border-black/10 pb-2.5 text-lg font-bold"
          style={{ height: SHEET.strip, color: title, fontFamily: fonts.title }}
        >
          {name}
        </p>
      )}

      <div className="flex justify-center pt-3" style={{ gap: SHEET.gap, paddingInline: SHEET.pad }}>
        {blocks.map((column, c) => (
          <div key={c} className="flex flex-col" style={{ width: width / scale, zoom: scale, gap: BLOCK_GAP }}>
            {column.map((block) => (
              <PrintBlockView
                key={block.key}
                block={block}
                country={country}
                titleColor={title}
                titleFont={fonts.title}
              />
            ))}
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
          <p className="mt-1 text-xs text-gray-500">
            {footer.madeWith} <span className="font-bold">menulala.com</span>
          </p>
        </div>
      </footer>
    </div>
  );
}
