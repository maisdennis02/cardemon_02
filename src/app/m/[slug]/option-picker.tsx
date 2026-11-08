"use client";

import { format } from "@/i18n/config";
import { useT } from "@/i18n/provider";
import { formatPrice, type MenuItem, type OptionGroup } from "@/lib/menu";
import { choiceHint } from "@/lib/menu-options";

export const groupDomId = (itemId: string, groupId: string) => `grp-${itemId}-${groupId}`;

// The option groups of an item (size, extras...). Controlled: the sheet owns
// `value` (chosen option ids). Without `onChange` (page with no ordering) it
// only lists groups and prices.
export function OptionPicker({
  item,
  country,
  accent,
  value,
  onChange,
  missing,
  readOnly,
}: {
  item: MenuItem;
  country: string | null;
  accent: string;
  value: string[];
  onChange?: (groupId: string, optionId: string) => void;
  missing?: string | null;
  readOnly?: boolean;
}) {
  const o = useT().menu.order;
  const chosen = new Set(value);

  const hintText = (group: OptionGroup) => {
    const h = choiceHint(group);
    if (h.kind === "one") return o.chooseOne;
    if (h.kind === "exactly") return format(o.chooseExactly, { n: h.max });
    if (h.kind === "upTo") return format(o.chooseUpTo, { n: h.max });
    return format(o.chooseRange, { min: h.min, max: h.max });
  };

  return (
    <div className="flex flex-col gap-4">
      {(item.groups ?? []).map((group) => {
        const count = group.options.filter((x) => chosen.has(x.id)).length;
        const max = Math.min(group.max, group.options.length);
        const single = group.max === 1;
        const bad = missing === group.id;
        return (
          <fieldset
            key={group.id}
            id={groupDomId(item.id, group.id)}
            aria-invalid={bad ? "true" : undefined}
            className="flex min-w-0 flex-col gap-1 border-0 p-0"
          >
            <legend className="mb-1 flex w-full items-baseline justify-between gap-2 p-0">
              <span className="font-semibold">{group.title}</span>
              <span className="text-xs text-gray-500">
                {group.min > 0 ? o.required : o.optional} · {hintText(group)}
              </span>
            </legend>
            {bad && (
              <p role="alert" className="text-sm font-medium text-red-600">
                {format(o.missingChoice, { group: group.title })}
              </p>
            )}
            {group.options.map((opt) => {
              const price = opt.priceCents > 0 ? format(o.optionPrice, { price: formatPrice(opt.priceCents, country) }) : null;
              const on = chosen.has(opt.id);
              if (readOnly) {
                return (
                  <div key={opt.id} className="flex justify-between gap-3 py-1 text-gray-700">
                    <span>{opt.name}</span>
                    {price && <span className="tabular-nums">{price}</span>}
                  </div>
                );
              }
              const disabled = !single && !on && count >= max;
              return (
                <label
                  key={opt.id}
                  className={`flex min-h-11 items-center gap-3 py-1 ${disabled ? "opacity-50" : ""}`}
                >
                  <input
                    type={single ? "radio" : "checkbox"}
                    name={group.id}
                    checked={on}
                    disabled={disabled}
                    onChange={() => onChange?.(group.id, opt.id)}
                    // A checked radio fires no change event on re-tap; click does.
                    onClick={single && on ? () => onChange?.(group.id, opt.id) : undefined}
                    className="size-5"
                    style={{ accentColor: accent }}
                  />
                  <span className="flex-1">{opt.name}</span>
                  {price && <span className="tabular-nums text-gray-600">{price}</span>}
                </label>
              );
            })}
          </fieldset>
        );
      })}
    </div>
  );
}
