// A national number of exactly these lengths is missing its calling code, which
// wa.me needs. Brazil: DDD + 8 (landline) or 9 (mobile) digits; a full
// international number is 12-13 digits, so a 10-11 digit one never already has
// the 55 — even when its DDD is 55 (Santa Maria, RS).
const NATIONAL_LENGTHS: Record<string, { lengths: number[]; code: string }> = {
  BR: { lengths: [10, 11], code: "55" },
  MX: { lengths: [10], code: "52" },
  US: { lengths: [10], code: "1" },
};

// Digits-only WhatsApp number (8-15 digits, same rule as the settings form),
// tolerant of spaces, dashes, parentheses and a leading "+" from dictation.
// With the restaurant's country, a number given without its calling code
// ("11 91234-5678" in Brazil) gets it.
export function normalizeWhatsapp(input: string, country?: string | null): string | null {
  let digits = input.replace(/\D/g, "");
  const national = country ? NATIONAL_LENGTHS[country] : undefined;
  if (national?.lengths.includes(digits.length)) digits = national.code + digits;
  return /^\d{8,15}$/.test(digits) ? digits : null;
}
