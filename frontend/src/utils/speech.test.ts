import { describe, expect, it } from "vitest";
import {
  applySpeechCorrections,
  mergeTranscript,
  normalizeSpeechTerms,
  toSpeechAlias,
} from "./speech";

const correction = (wrongText: string, correctText: string) => ({
  id: wrongText,
  wrongText,
  correctText,
  createdAt: "2026-08-23T00:00:00.000Z",
});

describe("speech utilities", () => {
  it("keeps only the latest interim result", () => {
    expect(mergeTranscript("안녕", "안 와 30")).toBe("안녕 안 와 30");
    expect(mergeTranscript("안", "안 와 30")).toBe("안 와 30");
  });

  it("applies one or more corrections", () => {
    expect(
      applySpeechCorrections("아마 상악 똥 확인", [
        correction("아마", "안와"),
        correction("상악 똥", "상악동"),
      ]),
    ).toBe("안와 상악동 확인");
  });

  it("applies longer wrong phrases first and handles regex characters", () => {
    expect(
      applySpeechCorrections("가나다 가나 a+b", [
        correction("가나", "짧은"),
        correction("가나다", "긴 표현"),
        correction("a+b", "특수어"),
      ]),
    ).toBe("긴 표현 짧은 특수어");
  });

  it("normalizes spaces inside registered speech terms", () => {
    expect(
      normalizeSpeechTerms("안 와 골절과 상악동", ["안와", "상악동"]),
    ).toBe("안와 골절과 상악동");
  });

  it("normalizes Korean letter names and Latin letters to the registered term", () => {
    expect(toSpeechAlias("미지바 에프")).toBe("미지바 f");
    expect(normalizeSpeechTerms("미지바 f를 확인", ["미지바 에프"])).toBe(
      "미지바 에프를 확인",
    );
  });
});
