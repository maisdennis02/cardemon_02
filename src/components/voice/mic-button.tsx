"use client";

import { useRef } from "react";
import { appendTranscript } from "@/lib/speech";
import { useSpeechInput } from "./use-speech-input";

// Hold to talk: press and keep pressing, speak, release. What is heard is
// added after whatever the field already holds. Renders nothing where the
// browser can't recognize speech; the keyboard (and its own dictation) still
// works there.
export function MicButton({
  value,
  onChange,
  lang,
  label,
  separator = " ",
}: {
  value: string;
  onChange: (value: string) => void;
  lang: string;
  label: string;
  // Between what the field held and what is heard: "\n" for one-per-line lists.
  separator?: string;
}) {
  const base = useRef(value);
  const { supported, listening, failed, start, stop } = useSpeechInput({
    lang,
    onText: (heard) => onChange(appendTranscript(base.current, heard, separator)),
  });
  if (!supported) return null;

  function begin() {
    base.current = value;
    start();
  }

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={listening}
      disabled={failed}
      onPointerDown={(e) => {
        e.preventDefault();
        begin();
      }}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onContextMenu={(e) => e.preventDefault()}
      onKeyDown={(e) => {
        if ((e.key === " " || e.key === "Enter") && !e.repeat) {
          e.preventDefault();
          begin();
        }
      }}
      onKeyUp={(e) => {
        if (e.key === " " || e.key === "Enter") stop();
      }}
      style={{ touchAction: "none", WebkitUserSelect: "none", userSelect: "none" }}
      className={`flex size-11 shrink-0 items-center justify-center rounded-full transition disabled:opacity-30 ${
        listening ? "scale-110 bg-red-600 text-white" : "bg-gray-100 text-gray-700"
      }`}
    >
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect x="9" y="3" width="6" height="11" rx="3" />
        <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
      </svg>
    </button>
  );
}
