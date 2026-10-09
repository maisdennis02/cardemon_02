"use client";

// localStorage behind useSyncExternalStore, so the server render (no cart) and
// the first client render agree, and every open copy of the menu stays in step.
// Falls back to memory where storage throws (private mode, blocked storage).

const listeners = new Set<() => void>();
const memory = new Map<string, string>();

export function subscribeCart(onChange: () => void): () => void {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function readCartRaw(key: string): string | null {
  try {
    return window.localStorage.getItem(key) ?? memory.get(key) ?? null;
  } catch {
    return memory.get(key) ?? null;
  }
}

export function writeCartRaw(key: string, value: string): void {
  memory.set(key, value);
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Memory copy above is enough for this visit.
  }
  listeners.forEach((l) => l());
}
