import { describe, expect, it } from "vitest";
import { appendTranscript, speechLang } from "@/lib/speech";

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
