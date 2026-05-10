"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Dictionary } from "./dictionaries/en";
import type { Locale } from "./config";

type Ctx = { locale: Locale; t: Dictionary };

const DictionaryContext = createContext<Ctx | null>(null);

export function DictionaryProvider({
  locale,
  dictionary,
  children,
}: {
  locale: Locale;
  dictionary: Dictionary;
  children: ReactNode;
}) {
  return (
    <DictionaryContext.Provider value={{ locale, t: dictionary }}>
      {children}
    </DictionaryContext.Provider>
  );
}

export function useT(): Dictionary {
  const ctx = useContext(DictionaryContext);
  if (!ctx) throw new Error("useT must be used inside <DictionaryProvider>");
  return ctx.t;
}

export function useLocale(): Locale {
  const ctx = useContext(DictionaryContext);
  if (!ctx) throw new Error("useLocale must be used inside <DictionaryProvider>");
  return ctx.locale;
}
