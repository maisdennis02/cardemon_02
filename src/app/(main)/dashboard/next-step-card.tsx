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
    // The menu card above already carries the builder CTA; a second one
    // here would just repeat it.
    case "finish_menu":
      return null;
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
