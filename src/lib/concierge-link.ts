// "We build it for you" offer in the builder (11/11/2026): the owner sends a
// photo of the menu to menulala's WhatsApp and we fill the items
// (scripts/concierge-fill.ts). The number comes from CONCIERGE_WHATSAPP; while
// it is unset or not a full international number, the offer stays hidden.
export function conciergeWhatsappUrl(rawNumber: string | undefined, text: string): string | null {
  const digits = (rawNumber ?? "").replace(/\D/g, "");
  if (digits.length < 12 || digits.length > 15) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}
