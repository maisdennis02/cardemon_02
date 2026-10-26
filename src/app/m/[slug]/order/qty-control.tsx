// The − n + control: on a card once the item is in the order, and in the item
// sheet before adding.
export function QtyControl({
  qty,
  accent,
  label,
  lessLabel,
  moreLabel,
  onChange,
}: {
  qty: number;
  accent: string;
  label: string;
  lessLabel: string;
  moreLabel: string;
  onChange: (qty: number) => void;
}) {
  return (
    <div className="flex items-center justify-end gap-4" aria-label={label}>
      <button
        type="button"
        aria-label={lessLabel}
        onClick={() => onChange(qty - 1)}
        className="flex size-8 items-center justify-center rounded-full border-2 text-lg font-bold"
        style={{ borderColor: accent, color: accent }}
      >
        −
      </button>
      <span className="min-w-6 text-center font-bold tabular-nums">{qty}</span>
      <button
        type="button"
        aria-label={moreLabel}
        onClick={() => onChange(qty + 1)}
        className="flex size-8 items-center justify-center rounded-full text-lg font-bold text-white"
        style={{ background: accent }}
      >
        +
      </button>
    </div>
  );
}
