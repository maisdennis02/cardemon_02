import Link from "next/link";
import { Logo } from "@/components/logo";

// Shared shell for the legal pages (/terms, /privacy): same header, type
// rhythm, and section structure, so the two pages only supply content.

export type LegalSection = { heading: string; paragraphs: string[] };
export type LegalContent = {
  title: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
};

export function LegalArticle({ content }: { content: LegalContent }) {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="border-b border-gray-100">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link href="/">
            <Logo />
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <h1 className="mb-2 text-3xl font-bold text-[color:var(--color-navy)]">
          {content.title}
        </h1>
        <p className="mb-8 text-sm text-gray-500">{content.updated}</p>
        <p className="mb-8 leading-relaxed text-gray-700">{content.intro}</p>
        <div className="flex flex-col gap-8">
          {content.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="mb-2 text-lg font-bold text-[color:var(--color-navy)]">
                {section.heading}
              </h2>
              <div className="flex flex-col gap-3">
                {section.paragraphs.map((p, i) => (
                  <p key={i} className="leading-relaxed text-gray-700">
                    {p}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
