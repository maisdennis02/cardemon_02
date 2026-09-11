import Link from "next/link";
import { ExternalIcon, ArrowRightIcon } from "@/components/icons";
import type { Dictionary } from "@/i18n";

/**
 * Shown when a menu has images but has never been viewed — not even by the
 * owner who just uploaded them. Nothing else in the dashboard marks the moment
 * the menu goes from "built" to "in use", so an owner who uploads on a slow
 * afternoon can simply never come back to it, and the QR never reaches a table.
 *
 * Disappears on the first view, including the owner's own, so it can't nag
 * anyone whose menu is already circulating.
 */
export function MenuLiveCallout({ slug, t }: { slug: string; t: Dictionary }) {
  const d = t.dashboard.menuLive;

  return (
    <section
      aria-labelledby="menu-live-title"
      className="flex flex-col gap-4 rounded-2xl border border-[color:var(--color-brand-100)] border-l-4 border-l-[color:var(--color-brand)] bg-[color:var(--color-cream-deep)] p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6"
    >
      <div className="flex flex-col gap-1.5">
        <h2
          id="menu-live-title"
          className="text-base font-bold text-[color:var(--color-navy)] sm:text-lg"
        >
          {d.title}
        </h2>
        <p className="text-sm leading-relaxed text-gray-600">{d.body}</p>
      </div>
      <div className="flex flex-col gap-2 self-start sm:flex-none sm:flex-row sm:items-center sm:self-auto">
        <Link
          href={`/m/${slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary"
        >
          {d.cta}
          <ExternalIcon size={16} />
        </Link>
        <Link href="#menu-qr" scroll className="btn btn-secondary">
          {d.qrCta}
          <ArrowRightIcon size={16} className="animate-nudge-right" />
        </Link>
      </div>
    </section>
  );
}
