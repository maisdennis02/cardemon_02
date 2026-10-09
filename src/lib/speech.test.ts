import { describe, expect, it } from "vitest";
import { appendTranscript, isFatalSpeechError, joinResults, speechLang } from "@/lib/speech";

describe("speechLang", () => {
  it("maps the app's locales to recognizer languages", () => {
    expect(speechLang("pt-BR")).toBe("pt-BR");
    expect(speechLang("es")).toBe("es-ES");
    expect(speechLang("en")).toBe("en-US");
  });
});

describe("appendTranscript", () => {
  it("appends to what was already typed, with one space", () => {
    expect(appendTranscript("Rua A", " 123 ")).toBe("Rua A 123");
    expect(appendTranscript("Rua A ", "123")).toBe("Rua A 123");
  });

  it("fills an empty field", () => {
    expect(appendTranscript("", "Ana")).toBe("Ana");
  });

  it("leaves the field alone when nothing was heard", () => {
    expect(appendTranscript("Ana", "  ")).toBe("Ana");
  });
});

describe("isFatalSpeechError", () => {
  it("gives up only when the microphone cannot be used at all", () => {
    for (const code of ["not-allowed", "service-not-allowed", "audio-capture", "language-not-supported"]) {
      expect(isFatalSpeechError(code)).toBe(true);
    }
  });

  it("keeps the mic for silence, a quick release or a network blip", () => {
    for (const code of ["no-speech", "aborted", "network", "whatever-new"]) {
      expect(isFatalSpeechError(code)).toBe(false);
    }
  });
});

describe("joinResults", () => {
  it("joins recognizer results with single spaces", () => {
    expect(joinResults(["Rua A", " 123", "  ap 4 "])).toBe("Rua A 123 ap 4");
  });
});
