/**
 * The single card the dashboard home shows under the menu card. Pure on
 * purpose: the page computes the state from the rows it already loads, and
 * this decides what to nudge first.
 *
 * Order matters: each step only appears once the ones before it are done.
 */
export type NextStep = "finish_menu" | "share" | "whatsapp" | "delivery" | null;

export type NextStepState = {
  hasMenu: boolean;
  mode: "photos" | "built";
  totalViews: number;
  hasWhatsapp: boolean;
  hasDeliveryLink: boolean;
};

export function nextStep(s: NextStepState): NextStep {
  if (!s.hasMenu) return "finish_menu";
  // WhatsApp orders only exist on the text menu, so photo menus skip this step.
  // It comes before sharing: a text menu without the number takes no orders.
  if (s.mode === "built" && !s.hasWhatsapp) return "whatsapp";
  if (s.totalViews === 0) return "share";
  if (!s.hasDeliveryLink) return "delivery";
  return null;
}
