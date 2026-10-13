import Link from "next/link";
import { ArrowRightIcon } from "@/components/icons";
import type { Dictionary } from "@/i18n";
import { nextStep, type NextStepState } from "@/lib/next-step";
import { MenuLiveCallout } from "./menu-live-callout";
import { DeliverySetupCallout } from "./delivery-setup-callout";
import { WhatsappStep } from "./whatsapp-step";

// The one nudge under the menu card (spec §3.2). Which one is nextStep's call;
// this only renders it.
export function NextStepCard({
  state,
  restaurantId,
  slug,
  t,
}: {
  state: NextStepState;
  restaurantId: string;
  slug: string;
  t: Dictionary;
}) {
  switch (nextStep(state)) {
    case "finish_menu":
      return <FinishMenuCallout t={t} />;
    case "share":
      return <MenuLiveCallout slug={slug} t={t} />;
    case "whatsapp":
      return <WhatsappStep restaurantId={restaurantId} />;
    case "delivery":
      return <DeliverySetupCallout t={t} />;
    case null:
      return null;
  }
}

function FinishMenuCallout({ t }: { t: Dictionary }) {
  const h = t.dashboard.home;
  return (
    <section
      aria-labelledby="finish-menu-title"
      className="flex flex-col gap-4 rounded-2xl border border-[color:var(--color-brand-100)] border-l-4 border-l-[color:var(--color-brand)] bg-[color:var(--color-cream-deep)] p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6"
    >
      <div className="flex flex-col gap-1.5">
        <h2
          id="finish-menu-title"
          className="text-base font-bold text-[color:var(--color-navy)] sm:text-lg"
        >
          {h.finishTitle}
        </h2>
        <p className="text-sm leading-relaxed text-gray-600">{h.finishLead}</p>
      </div>
      <Link
        href="/dashboard/cardapio"
        className="btn btn-primary w-full sm:w-auto sm:flex-none"
      >
        {h.continueMenu}
        <ArrowRightIcon size={16} className="animate-nudge-right" />
      </Link>
    </section>
  );
}
