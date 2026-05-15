import Link from "next/link";
import { ArrowRightIcon } from "@/components/icons";
import type { Dictionary } from "@/i18n";

export function DeliverySetupCallout({ t }: { t: Dictionary }) {
  const d = t.dashboard.deliverySetup;

  return (
    <section
      aria-labelledby="delivery-setup-title"
      className="flex flex-col gap-4 rounded-2xl border border-[color:var(--color-brand-100)] border-l-4 border-l-[color:var(--color-brand)] bg-[color:var(--color-cream-deep)] p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6"
    >
      <div className="flex flex-col gap-1.5">
        <h2
          id="delivery-setup-title"
          className="text-base font-bold text-[color:var(--color-navy)] sm:text-lg"
        >
          {d.title}
        </h2>
        <p className="text-sm leading-relaxed text-gray-600">{d.body}</p>
      </div>
      <Link
        href="?edit=1#country"
        scroll
        className="btn btn-primary self-start sm:self-auto sm:flex-none"
      >
        {d.cta}
        <ArrowRightIcon size={16} className="animate-nudge-right" />
      </Link>
    </section>
  );
}
