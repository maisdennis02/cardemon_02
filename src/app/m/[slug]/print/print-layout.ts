// Where each block of the printable menu goes (spec 2026-10-28 §2). Pure:
// the page measures the blocks and hands the heights in, so PDF and JPG get
// the same sheets and the rules are testable without a browser.

// An A4 sheet in CSS px (210 × 297 mm at 96 dpi) and what is reserved on it.
export const SHEET = { width: 794, height: 1123, pad: 36, gap: 24, footer: 104, strip: 56, oneColumn: 480 } as const;
export const SCALE_MIN = 0.8;
export const SCALE_MAX = 1.6;
// Measured heights round down; a 4 % margin keeps the last card off the footer.
export const SLACK = 0.96;
export const ONE_COLUMN_MAX_ITEMS = 8;

export type Block = { kind: "title" | "item"; key: string; height: number };
export type Sheet = Block[][]; // columns → blocks

export function columnsFor(itemCount: number): 1 | 2 {
  return itemCount <= ONE_COLUMN_MAX_ITEMS ? 1 : 2;
}

export function columnWidth(columns: 1 | 2): number {
  return columns === 1 ? SHEET.oneColumn : (SHEET.width - 2 * SHEET.pad - SHEET.gap) / 2;
}

// Greedy fill: column by column, sheet by sheet. A title needs room for
// itself and the card after it, so it never ends a column.
export function paginate(blocks: Block[], columns: 1 | 2, cap1: number, capN: number): Sheet[] {
  const sheets: Sheet[] = [];
  let sheet: Sheet = [];
  let col = 0;
  let used = 0;
  const newSheet = () => {
    sheet = Array.from({ length: columns }, () => []);
    sheets.push(sheet);
    col = 0;
    used = 0;
  };
  newSheet();
  blocks.forEach((b, i) => {
    const next = blocks[i + 1];
    const need = b.height + (b.kind === "title" && next ? next.height : 0);
    const cap = sheets.length === 1 ? cap1 : capN;
    if (used > 0 && used + need > cap) {
      if (col < columns - 1) {
        col++;
        used = 0;
      } else newSheet();
    }
    sheet[col].push(b);
    used += b.height;
  });
  return sheets;
}

// The same number of sheets as the greedy fill, with the blocks spread
// evenly: the smallest capacity that still needs no extra sheet.
export function balance(blocks: Block[], columns: 1 | 2, cap1: number, capN: number): Sheet[] {
  const greedy = paginate(blocks, columns, cap1, capN);
  const n = greedy.length;
  if (n === 1) return greedy;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2;
    if (paginate(blocks, columns, cap1 * mid, capN * mid).length <= n) hi = mid;
    else lo = mid;
  }
  return paginate(blocks, columns, cap1 * hi, capN * hi);
}

export function planLayout(input: {
  itemCount: number;
  headerHeight: number; // the sheet-1 header, margin included
  measureAt: (scale: number) => Block[]; // heights already multiplied by scale
}): { columns: 1 | 2; scale: number; sheets: Sheet[] } {
  const columns = columnsFor(input.itemCount);
  const cap1 = (SHEET.height - SHEET.footer - input.headerHeight) * SLACK;
  const capN = (SHEET.height - SHEET.footer - SHEET.strip) * SLACK;
  for (let step = Math.round(SCALE_MAX * 50); step >= Math.round(SCALE_MIN * 50); step--) {
    const scale = step / 50;
    const sheets = paginate(input.measureAt(scale), columns, cap1, capN);
    if (sheets.length === 1) return { columns, scale, sheets };
  }
  return { columns, scale: 1, sheets: balance(input.measureAt(1), columns, cap1, capN) };
}
