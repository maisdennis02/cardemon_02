"use client";

import { useEffect, useState } from "react";

// Self-contained copy on purpose: this boundary shows when the rest of the
// route (including the dictionary pipeline) failed, so it can't depend on the
// DictionaryProvider or any server data.
const MESSAGES = {
  en: {
    title: "This menu is temporarily unavailable",
    body: "Something went wrong on our side. Please try again in a moment, or ask the staff for a printed menu.",
    retry: "Try again",
  },
  pt: {
    title: "Este cardápio está temporariamente indisponível",
    body: "Tivemos um problema do nosso lado. Tente novamente em instantes ou peça o cardápio impresso a um atendente.",
    retry: "Tentar novamente",
  },
  es: {
    title: "Este menú no está disponible en este momento",
    body: "Tuvimos un problema de nuestro lado. Inténtalo de nuevo en unos instantes o pide la carta impresa al personal.",
    retry: "Intentar de nuevo",
  },
} as const;

function pickMessages(): (typeof MESSAGES)[keyof typeof MESSAGES] {
  const lang = navigator.language?.toLowerCase() ?? "";
  if (lang.startsWith("pt")) return MESSAGES.pt;
  if (lang.startsWith("es")) return MESSAGES.es;
  return MESSAGES.en;
}

export default function MenuError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [t, setT] = useState<(typeof MESSAGES)[keyof typeof MESSAGES]>(MESSAGES.en);

  useEffect(() => {
    console.error(error);
  }, [error]);

  useEffect(() => {
    setT(pickMessages());
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-4xl" aria-hidden>
        🍽️
      </p>
      <h1 className="text-xl font-bold">{t.title}</h1>
      <p className="max-w-sm text-sm text-gray-600">{t.body}</p>
      <button
        type="button"
        onClick={reset}
        className="mt-2 min-h-11 cursor-pointer rounded-full bg-black px-6 py-2.5 text-sm font-bold text-white"
      >
        {t.retry}
      </button>
    </main>
  );
}
