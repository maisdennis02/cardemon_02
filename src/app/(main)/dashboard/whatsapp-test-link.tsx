"use client";

import { useT } from "@/i18n/provider";
import { format } from "@/i18n/config";
import { whatsappOrderUrl } from "@/lib/order";
import { normalizeWhatsapp } from "@/lib/whatsapp";

// "Test this number": opens WhatsApp on the number the owner typed, with a
// message to themselves. Nothing on our side can tell whether a number is on
// WhatsApp; WhatsApp itself says so when it is not, which is how a wrong number
// gets caught before a diner's order goes nowhere. Hidden while the number is
// not usable at all — the format error already covers that.
export function WhatsappTestLink({
  number,
  country,
  restaurantName,
  hint = false,
}: {
  number: string;
  country: string | null | undefined;
  restaurantName: string;
  hint?: boolean;
}) {
  const t = useT();
  const h = t.dashboard.home;
  const digits = normalizeWhatsapp(number, country);
  if (!digits) return null;
  const href = whatsappOrderUrl(digits, format(h.whatsappTestMessage, { name: restaurantName }));

  const link = (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-semibold text-[color:var(--color-brand)] hover:text-[color:var(--color-brand-600)]"
    >
      {h.whatsappTest}
    </a>
  );
  if (!hint) return link;
  return (
    <p className="text-sm text-gray-500">
      {link} · {h.whatsappTestHint}
    </p>
  );
}
