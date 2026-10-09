// Rules behind the hold-to-talk microphone (src/components/voice). Pure so
// they can be tested without a browser.

import type { Locale } from "@/i18n/config";

const SPEECH_LANG: Record<Locale, string> = { "pt-BR": "pt-BR", es: "es-ES", en: "en-US" };

export function speechLang(locale: Locale): string {
  return SPEECH_LANG[locale];
}

// Dictation adds to what the field already holds; it never replaces typing.
export function appendTranscript(base: string, transcript: string): string {
  const heard = transcript.trim();
  if (!heard) return base;
  const kept = base.trimEnd();
  return kept ? `${kept} ${heard}` : heard;
}
