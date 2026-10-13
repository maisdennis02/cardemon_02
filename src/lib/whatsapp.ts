// Digits-only WhatsApp number (8-15 digits, same rule as the settings form),
// tolerant of spaces, dashes, parentheses and a leading "+" from dictation.
export function normalizeWhatsapp(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  return /^\d{8,15}$/.test(digits) ? digits : null;
}
