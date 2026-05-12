// Plan limits, prices, and the helper for resolving a user's effective plan.
// Source of truth for plan state is User.proExpiresAt — see prisma/schema.prisma.

export const FREE_IMAGE_LIMIT = 2;
export const PRO_IMAGE_LIMIT = 20;

// Locale-aware pricing. Brazil shows BRL, everywhere else shows USD.
// Stripe Prices are currency-bound, so each pair lives behind its own env var.
export type Currency = "USD" | "BRL";

const PRICING_TABLE: Record<
  Currency,
  { symbol: string; monthly: number; annualTotal: number; decimalSep: "." | "," }
> = {
  USD: { symbol: "$", monthly: 4, annualTotal: 35, decimalSep: "." },
  BRL: { symbol: "R$ ", monthly: 20, annualTotal: 160, decimalSep: "," },
};

export function currencyForLocale(locale: string): Currency {
  return locale === "pt-BR" ? "BRL" : "USD";
}

export function pricesFor(currency: Currency) {
  const p = PRICING_TABLE[currency];
  const perMonthRaw = p.annualTotal / 12;
  return {
    currency,
    symbol: p.symbol,
    monthly: p.monthly,
    annualTotal: p.annualTotal,
    annualPerMonth: perMonthRaw.toFixed(2).replace(".", p.decimalSep),
    savings: p.monthly * 12 - p.annualTotal,
  };
}

export type Plan = "FREE" | "PRO";

export function isPro(user: { proExpiresAt: Date | null } | null | undefined): boolean {
  if (!user?.proExpiresAt) return false;
  return user.proExpiresAt.getTime() > Date.now();
}

export function planFor(user: { proExpiresAt: Date | null } | null | undefined): Plan {
  return isPro(user) ? "PRO" : "FREE";
}

export function imageLimitFor(user: { proExpiresAt: Date | null } | null | undefined): number {
  return isPro(user) ? PRO_IMAGE_LIMIT : FREE_IMAGE_LIMIT;
}
