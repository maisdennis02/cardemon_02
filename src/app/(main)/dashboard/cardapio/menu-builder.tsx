"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useT } from "@/i18n/provider";
import type { Locale } from "@/i18n/config";
import { capture } from "@/lib/posthog";
import { createAutosaver, type AutosaveStatus } from "@/lib/autosave";
import type { Menu, MenuTheme } from "@/lib/menu";
import { saveMenuDraft, saveMenuVisual } from "../menu-actions";
import { StepVisual } from "./step-visual";
import { StepItems } from "./step-items";
import { StepPreview } from "./step-preview";

export type BuilderStep = "visual" | "items" | "preview";
const STEPS: BuilderStep[] = ["visual", "items", "preview"];

export type BuilderRestaurant = { id: string; slug: string; name: string };

// The builder (spec §3). Holds the menu being edited and autosaves it as a
// draft; country and look are saved when the owner leaves the first step.
// Before the first publish it is a step-by-step flow; afterwards it opens on
// the items, with the steps as tabs.
export function MenuBuilder({
  restaurant,
  initialTheme,
  initial,
  hasPublished,
  isPro,
  sectionSuggestions,
  defaultCountry,
  hasCountry,
}: {
  restaurant: BuilderRestaurant;
  initialTheme: MenuTheme;
  initial: { menu: Menu; draftWasInvalid: boolean };
  hasPublished: boolean;
  isPro: boolean;
  sectionSuggestions: Record<Locale, string[]>;
  defaultCountry: string;
  hasCountry: boolean;
}) {
  const t = useT();
  const b = t.dashboard.builder;

  const [step, setStep] = useState<BuilderStep>(hasPublished ? "items" : "visual");
  const [menu, setMenuState] = useState(initial.menu);
  const [theme, setTheme] = useState(initialTheme);
  const [country, setCountry] = useState(defaultCountry);
  // An unsaved country (none stored yet) counts as a pending visual change.
  const [visualDirty, setVisualDirty] = useState(!hasCountry);
  const [visualSaving, setVisualSaving] = useState(false);
  const [visualError, setVisualError] = useState<string | null>(null);
  const [status, setStatus] = useState<AutosaveStatus>("idle");
  const [showDraftNotice, setShowDraftNotice] = useState(initial.draftWasInvalid);

  const saver = useRef<ReturnType<typeof createAutosaver<Menu>> | null>(null);
  useEffect(() => {
    const s = createAutosaver<Menu>({
      save: async (value) => {
        const res = await saveMenuDraft({ restaurantId: restaurant.id, menu: value });
        if (res.error) throw new Error(res.error);
      },
      onStatus: setStatus,
    });
    saver.current = s;
    return () => s.dispose();
  }, [restaurant.id]);

  // Edits arrive as the result of a pure operation on the current menu; an
  // operation with nothing to do returns the same object and saves nothing.
  const menuRef = useRef(initial.menu);
  const setMenu = useCallback((next: Menu) => {
    if (next === menuRef.current) return;
    menuRef.current = next;
    setMenuState(next);
    saver.current?.push(next);
  }, []);

  useEffect(() => {
    capture("builder_step", { step });
  }, [step]);

  // Leaving with edits that never reached the server: let the browser ask.
  const unsaved = status === "pending" || status === "saving" || status === "error";
  useEffect(() => {
    if (!unsaved) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [unsaved]);

  function changeTheme(next: MenuTheme) {
    setTheme(next);
    setVisualDirty(true);
  }

  function changeCountry(next: string) {
    setCountry(next);
    setVisualDirty(true);
  }

  async function goTo(next: BuilderStep) {
    if (next === step) return;
    if (step === "visual" && visualDirty) {
      setVisualSaving(true);
      setVisualError(null);
      const res = await saveMenuVisual({ restaurantId: restaurant.id, country, theme }).catch(() => ({
        error: b.visual.saveFailed,
      }));
      setVisualSaving(false);
      if (res.error) {
        setVisualError(res.error);
        return;
      }
      setVisualDirty(false);
    }
    setStep(next);
    window.scrollTo({ top: 0 });
  }

  const index = STEPS.indexOf(step);
  const tabs = hasPublished;

  return (
    <div className="flex min-h-screen flex-col bg-gray-50/60">
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3 px-4 py-3">
          <Link href="/dashboard" className="text-sm font-semibold text-[color:var(--color-navy)]">
            {b.backToDashboard}
          </Link>
          <span
            className={`text-xs tabular-nums ${status === "error" ? "text-red-600" : "text-gray-500"}`}
            aria-live="polite"
          >
            {status === "idle" ? "" : b.status[status]}
          </span>
        </div>
        <nav className="mx-auto flex max-w-lg px-4" aria-label={b.title}>
          {STEPS.map((s, i) => {
            const active = s === step;
            const reachable = tabs || i <= index;
            return (
              <button
                key={s}
                type="button"
                disabled={!reachable || visualSaving}
                onClick={() => goTo(s)}
                aria-current={active ? "step" : undefined}
                className={`flex-1 border-b-2 py-2 text-sm font-semibold transition ${
                  active
                    ? "border-[color:var(--color-brand)] text-[color:var(--color-brand)]"
                    : "border-transparent text-gray-500 disabled:opacity-40"
                }`}
              >
                {tabs ? b.steps[s] : `${i + 1}. ${b.steps[s]}`}
              </button>
            );
          })}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-6">
        {showDraftNotice && (
          <div className="mb-4 flex items-start justify-between gap-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            <p>{b.draftInvalid}</p>
            <button type="button" className="font-semibold" onClick={() => setShowDraftNotice(false)}>
              {b.dismiss}
            </button>
          </div>
        )}

        {step === "visual" && (
          <StepVisual
            restaurant={restaurant}
            country={country}
            onCountry={changeCountry}
            theme={theme}
            onTheme={changeTheme}
          />
        )}
        {step === "items" && (
          <StepItems
            menu={menu}
            setMenu={setMenu}
            isPro={isPro}
            country={country}
            sectionSuggestions={sectionSuggestions}
          />
        )}
        {step === "preview" && (
          <StepPreview
            restaurant={restaurant}
            menu={menu}
            theme={theme}
            country={country}
            isPro={isPro}
            settle={() => saver.current?.settle() ?? Promise.resolve()}
          />
        )}

        {visualError && (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{visualError}</p>
        )}

        <div className="mt-6 flex items-center justify-between gap-3">
          {!tabs && index > 0 ? (
            <button type="button" className="btn btn-ghost" onClick={() => goTo(STEPS[index - 1])}>
              {b.back}
            </button>
          ) : (
            <span />
          )}
          {!tabs && index < STEPS.length - 1 && (
            <button
              type="button"
              className="btn btn-primary"
              disabled={visualSaving}
              onClick={() => goTo(STEPS[index + 1])}
            >
              {visualSaving ? b.saving : b.next}
            </button>
          )}
          {tabs && step === "visual" && (
            <button
              type="button"
              className="btn btn-primary"
              disabled={visualSaving || !visualDirty}
              onClick={() => goTo("items")}
            >
              {visualSaving ? b.saving : b.save}
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
