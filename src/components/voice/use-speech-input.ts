"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { isFatalSpeechError, joinResults } from "@/lib/speech";

// The browser's own speech recognition (Safari and Chrome; not Firefox, nor
// some in-app browsers). No service, no cost. Typed locally: TypeScript's DOM
// library doesn't ship these yet.
type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};

function recognitionClass(): (new () => Recognition) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => Recognition;
    webkitSpeechRecognition?: new () => Recognition;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const noSubscribe = () => () => {};

// onText receives everything heard since start() — interim results included —
// so the caller can rebuild the field from what it held before listening.
export function useSpeechInput({ lang, onText }: { lang: string; onText: (text: string) => void }) {
  const supported = useSyncExternalStore(noSubscribe, () => recognitionClass() !== null, () => false);
  const [listening, setListening] = useState(false);
  const [failed, setFailed] = useState(false);
  const recognition = useRef<Recognition | null>(null);
  const onTextRef = useRef(onText);
  useEffect(() => {
    onTextRef.current = onText;
  }, [onText]);
  useEffect(() => () => recognition.current?.abort(), []);

  function start() {
    const Recognizer = recognitionClass();
    if (!Recognizer) return;
    // Pressed again before the last attempt finished winding down: drop it
    // and listen afresh rather than ignoring the press.
    if (recognition.current) {
      const previous = recognition.current;
      previous.onend = null;
      previous.onresult = null;
      previous.abort();
      recognition.current = null;
    }
    const r = new Recognizer();
    r.lang = lang;
    r.interimResults = true;
    r.continuous = true;
    r.onresult = (e) => {
      const heard = joinResults(Array.from(e.results, (result) => result[0]?.transcript ?? ""));
      onTextRef.current(heard);
    };
    r.onerror = (e) => {
      if (isFatalSpeechError(e.error)) setFailed(true);
    };
    r.onend = () => {
      recognition.current = null;
      setListening(false);
    };
    recognition.current = r;
    try {
      r.start();
      setListening(true);
    } catch {
      recognition.current = null;
      setFailed(true);
    }
  }

  function stop() {
    recognition.current?.stop();
  }

  return { supported, listening, failed, start, stop };
}
