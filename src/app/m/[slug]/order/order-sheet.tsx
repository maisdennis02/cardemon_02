"use client";

import { useState } from "react";
import { useLocale, useT } from "@/i18n/provider";
import { formatPrice, type MenuItem } from "@/lib/menu";
import { buildOrderMessage, orderErrors, whatsappOrderUrl, type OrderDetails } from "@/lib/order";
import { speechLang } from "@/lib/speech";
import { MicButton } from "@/components/voice/mic-button";
import { pingMenuEvent } from "../menu-actions";
import { QtyControl } from "./orderable-menu";

// The order on one screen: lines, who and how, and the send button that opens
// the restaurant's WhatsApp with the message ready (spec §2–3).
export function OrderSheet({
  slug,
  restaurantName,
  country,
  whatsappNumber,
  lines,
  totalText,
  accent,
  onQty,
  onClear,
  onClose,
}: {
  slug: string;
  restaurantName: string;
  country: string | null;
  whatsappNumber: string;
  lines: { item: MenuItem; qty: number }[];
  totalText: string;
  accent: string;
  onQty: (id: string, qty: number) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  const t = useT();
  const o = t.menu.order;
  const lang = speechLang(useLocale());
  const [details, setDetails] = useState<OrderDetails>({ name: "", mode: null, address: "", table: "", notes: "" });
  const [tried, setTried] = useState(false);
  const [sent, setSent] = useState(false);
  const errors = tried ? orderErrors(details) : {};
  const set = (patch: Partial<OrderDetails>) => setDetails((d) => ({ ...d, ...patch }));

  function send() {
    setTried(true);
    if (Object.keys(orderErrors(details)).length > 0 || lines.length === 0) return;
    const text = buildOrderMessage({
      restaurantName,
      slug,
      country,
      lines,
      details,
      labels: {
        title: o.msgTitle,
        total: o.msgTotal,
        toArrange: o.toArrange,
        plusToArrange: o.plusToArrange,
        name: o.msgName,
        delivery: o.msgDelivery,
        pickup: o.msgPickup,
        pickupTable: o.msgPickupTable,
        notes: o.msgNotes,
        footer: o.msgFooter,
      },
    });
    pingMenuEvent(slug, "click_order");
    setSent(true);
    window.location.href = whatsappOrderUrl(whatsappNumber, text);
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-white" role="dialog" aria-modal="true" aria-labelledby="order-title">
      <div className="mx-auto flex min-h-full w-full max-w-lg flex-col px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 id="order-title" className="text-2xl font-bold">
            {o.sheetTitle}
          </h2>
          <button type="button" onClick={onClose} className="text-sm font-semibold text-gray-600">
            {o.close}
          </button>
        </div>

        {sent ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
            <p className="text-lg">{o.sent}</p>
            <button
              type="button"
              className="w-full rounded-full px-5 py-4 font-bold text-white"
              style={{ background: accent }}
              onClick={() => {
                onClear();
                onClose();
              }}
            >
              {o.newOrder}
            </button>
            <button type="button" className="text-sm font-semibold text-gray-600" onClick={onClose}>
              {o.backToMenu}
            </button>
          </div>
        ) : lines.length === 0 ? (
          <p className="text-gray-600">{o.empty}</p>
        ) : (
          <>
            <ul className="divide-y divide-gray-100">
              {lines.map(({ item, qty }) => (
                <li key={item.id} className="pt-2.5">
                  <div className="flex items-baseline gap-3">
                    <span className="flex-1 font-medium">{item.name}</span>
                    <span className="whitespace-nowrap font-bold tabular-nums">
                      {item.priceCents === null ? o.toArrange : formatPrice(item.priceCents * qty, country)}
                    </span>
                  </div>
                  <QtyControl
                    qty={qty}
                    accent={accent}
                    label={item.name}
                    lessLabel={o.less}
                    moreLabel={o.more}
                    onChange={(n) => onQty(item.id, n)}
                  />
                </li>
              ))}
            </ul>
            <p className="mt-2 flex justify-between border-t-2 border-gray-900 pt-3 text-lg font-bold">
              <span>{o.total}</span>
              <span className="tabular-nums">{totalText}</span>
            </p>

            <div className="mt-6 flex flex-col gap-4">
              <Field
                label={o.name}
                value={details.name}
                onChange={(name) => set({ name })}
                error={errors.name && o.nameRequired}
                lang={lang}
                micLabel={o.mic}
                autoComplete="name"
              />

              <fieldset className="flex flex-col gap-2">
                <legend className="mb-2 text-sm font-semibold">{o.how}</legend>
                <div className="grid grid-cols-2 gap-3">
                  {(["delivery", "pickup"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      aria-pressed={details.mode === mode}
                      onClick={() => set({ mode })}
                      className="rounded-xl border-2 px-3 py-3 text-sm font-bold"
                      style={details.mode === mode ? { borderColor: accent, color: accent } : { borderColor: "#e5e7eb" }}
                    >
                      {mode === "delivery" ? o.delivery : o.pickup}
                    </button>
                  ))}
                </div>
                {errors.mode && <p className="text-sm text-red-600">{o.modeRequired}</p>}
              </fieldset>

              {details.mode === "delivery" && (
                <Field
                  label={o.address}
                  value={details.address}
                  onChange={(address) => set({ address })}
                  error={errors.address && o.addressRequired}
                  lang={lang}
                  micLabel={o.mic}
                  autoComplete="street-address"
                  multiline
                />
              )}
              {details.mode === "pickup" && (
                <Field
                  label={o.table}
                  value={details.table}
                  onChange={(table) => set({ table })}
                  lang={lang}
                  micLabel={o.mic}
                />
              )}
              <Field
                label={o.notes}
                value={details.notes}
                onChange={(notes) => set({ notes })}
                placeholder={o.notesPlaceholder}
                lang={lang}
                micLabel={o.mic}
                multiline
              />
            </div>

            <button
              type="button"
              onClick={send}
              className="mt-6 w-full rounded-full bg-[#25d366] px-5 py-4 font-bold text-white shadow"
            >
              {o.send}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  error,
  placeholder,
  lang,
  micLabel,
  autoComplete,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string | false;
  placeholder?: string;
  lang: string;
  micLabel: string;
  autoComplete?: string;
  multiline?: boolean;
}) {
  const className = `w-full rounded-lg border px-3 py-2.5 text-base ${error ? "border-red-500" : "border-gray-300"}`;
  return (
    <label className="flex flex-col gap-1.5 text-sm font-semibold">
      {label}
      <span className="flex items-start gap-2">
        {multiline ? (
          <textarea
            rows={2}
            maxLength={300}
            className={className}
            value={value}
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.value)}
          />
        ) : (
          <input
            maxLength={120}
            className={className}
            value={value}
            placeholder={placeholder}
            autoComplete={autoComplete}
            onChange={(e) => onChange(e.target.value)}
          />
        )}
        <MicButton value={value} onChange={onChange} lang={lang} label={micLabel} />
      </span>
      {error && <span className="text-sm font-normal text-red-600">{error}</span>}
    </label>
  );
}
