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

// Errors after which the mic can't work on this page (permission refused, no
// microphone, language not available). Silence ("no-speech"), a quick release
// ("aborted") and a network blip just end this attempt.
const FATAL = new Set(["not-allowed", "service-not-allowed", "audio-capture", "language-not-supported"]);

export function isFatalSpeechError(code: string): boolean {
  return FATAL.has(code);
}

// Recognizers start later results with a space; join without doubling it.
export function joinResults(parts: string[]): string {
  return parts
    .map((p) => p.trim())
    .filter(Boolean)
    .join(" ");
}
