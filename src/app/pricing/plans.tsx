"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckIcon } from "@/components/icons";
import { useT } from "@/i18n/provider";
import { format } from "@/i18n/config";
import {
  FREE_IMAGE_LIMIT,
  PRO_IMAGE_LIMIT,
  pricesFor,
  type Currency,
} from "@/lib/pricing";

type Plan = "FREE" | "PRO";
type Cycle = "MONTHLY" | "ANNUAL";

export function PricingPlans({
  currentPlan,
  currency,
}: {
  currentPlan: Plan | null;
  currency: Currency;
}) {
  const t = useT();
  const [cycle, setCycle] = useState<Cycle>("ANNUAL");
  const p = t.pricing;
  const prices = pricesFor(currency);
  const proPrice = cycle === "ANNUAL" ? prices.annualTotal : prices.monthly;
  const proPeriodLabel = cycle === "ANNUAL" ? p.perYear : p.perMonth;

  return (
    <div className="mt-10 flex flex-col items-center gap-10">
      <CycleToggle cycle={cycle} onChange={setCycle} savings={prices.savings} />

      <div className="grid w-full gap-6 md:grid-cols-2">
        <PlanCard
          name={p.free.name}
          priceLine={p.free.priceLine}
          features={[
            format(p.free.featurePages, { limit: FREE_IMAGE_LIMIT }),
            p.free.featureQr,
            p.free.featureDelivery,
          ]}
          cta={
            currentPlan === "FREE" ? (
              <button className="btn btn-secondary w-full" disabled>
                {p.free.cta}
              </button>
            ) : currentPlan === null ? (
              <Link href="/signup" className="btn btn-secondary w-full">
                {t.common.getStarted}
              </Link>
            ) : null
          }
        />

        <PlanCard
          highlight
          badge={p.popular}
          name={p.pro.name}
          priceMain={
            <>
              <span className="text-5xl font-bold text-[color:var(--color-navy)]">
                {prices.symbol}
                {proPrice}
              </span>
              <span className="ml-1 text-base text-gray-500">{proPeriodLabel}</span>
            </>
          }
          priceSub={
            cycle === "ANNUAL"
              ? format(p.annualPerMonthNote, { perMonth: prices.annualPerMonth })
              : undefined
          }
          features={[
            format(p.pro.featurePages, { limit: PRO_IMAGE_LIMIT }),
            p.pro.featureQr,
            p.pro.featureDelivery,
            p.pro.featurePriority,
          ]}
          cta={
            currentPlan === "PRO" ? (
              <form action="/api/stripe/portal" method="post">
                <button type="submit" className="btn btn-primary w-full">
                  {p.pro.cta}
                </button>
              </form>
            ) : currentPlan === "FREE" ? (
              <form action="/api/stripe/checkout" method="post">
                <input type="hidden" name="cycle" value={cycle} />
                <button type="submit" className="btn btn-primary w-full">
                  {p.pro.cta}
                </button>
              </form>
            ) : (
              <Link href="/signup" className="btn btn-primary w-full">
                {p.pro.cta}
              </Link>
            )
          }
        />
      </div>
    </div>
  );
}

function CycleToggle({
  cycle,
  onChange,
  savings,
}: {
  cycle: Cycle;
  onChange: (c: Cycle) => void;
  savings: number;
}) {
  const t = useT();
  const p = t.pricing;
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white p-1 shadow-sm">
      <ToggleButton active={cycle === "MONTHLY"} onClick={() => onChange("MONTHLY")}>
        {p.monthlyTab}
      </ToggleButton>
      <ToggleButton active={cycle === "ANNUAL"} onClick={() => onChange("ANNUAL")}>
        <span>{p.annualTab}</span>
        <span className="ml-2 rounded-full bg-[color:var(--color-brand-50)] px-2 py-0.5 text-xs font-bold text-[color:var(--color-brand-700)]">
          {format(p.annualBadge, { savings })}
        </span>
      </ToggleButton>
    </div>
  );
}

function ToggleButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
        active
          ? "bg-[color:var(--color-navy)] text-white"
          : "text-gray-600 hover:text-[color:var(--color-navy)]"
      }`}
    >
      {children}
    </button>
  );
}

function PlanCard({
  name,
  priceLine,
  priceMain,
  priceSub,
  features,
  cta,
  highlight = false,
  badge,
}: {
  name: string;
  priceLine?: string;
  priceMain?: React.ReactNode;
  priceSub?: string;
  features: string[];
  cta: React.ReactNode;
  highlight?: boolean;
  badge?: string;
}) {
  return (
    <div
      className={`relative flex flex-col rounded-2xl border bg-white p-7 shadow-sm ${
        highlight
          ? "border-[color:var(--color-brand)] ring-2 ring-[color:var(--color-brand)]/20"
          : "border-gray-200"
      }`}
    >
      {badge && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[color:var(--color-brand)] px-3 py-1 text-xs font-bold uppercase tracking-wide text-white shadow">
          {badge}
        </span>
      )}

      <h2 className="text-xl font-bold text-[color:var(--color-navy)]">{name}</h2>

      <div className="mt-4 min-h-[80px]">
        {priceMain ? (
          <div className="flex items-baseline">{priceMain}</div>
        ) : (
          <p className="text-2xl font-semibold text-[color:var(--color-navy)]">
            {priceLine}
          </p>
        )}
        {priceSub && (
          <p className="mt-1 text-sm text-gray-500">{priceSub}</p>
        )}
      </div>

      <ul className="mt-5 flex flex-col gap-3">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
            <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[color:var(--color-brand-50)] text-[color:var(--color-brand)]">
              <CheckIcon size={12} />
            </span>
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <div className="mt-7">{cta}</div>
    </div>
  );
}
