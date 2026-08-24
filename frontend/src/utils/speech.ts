import type { SpeechCorrection } from "@/types";

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const letterNames: Record<string, string> = {
  더블유: "w",
  에이치: "h",
  에이: "a",
  비: "b",
  씨: "c",
  디: "d",
  이: "e",
  에프: "f",
  아이: "i",
  제이: "j",
  케이: "k",
  엘: "l",
  엠: "m",
  엔: "n",
  오: "o",
  피: "p",
  큐: "q",
  알: "r",
  에스: "s",
  티: "t",
  유: "u",
  브이: "v",
  엑스: "x",
  와이: "y",
  제트: "z",
  지: "g",
};

export const toSpeechAlias = (term: string) =>
  Object.entries(letterNames)
    .sort(([a], [b]) => b.length - a.length)
    .reduce(
      (value, [name, letter]) =>
        value.replace(
          new RegExp(`(^|\\s)${escapeRegExp(name)}(?=\\s|$)`, "g"),
          `$1${letter}`,
        ),
      term,
    );

export function mergeTranscript(previous: string, next: string) {
  const a = previous.trim();
  const b = next.trim();
  if (!a) return b;
  if (!b || a.endsWith(b)) return a;
  if (b.startsWith(a)) return b;
  return `${a} ${b}`.trim();
}

export function applySpeechCorrections(
  text: string,
  corrections: SpeechCorrection[],
) {
  return corrections
    .filter(
      (correction) =>
        correction.wrongText.trim() && correction.correctText.trim(),
    )
    .sort((a, b) => b.wrongText.length - a.wrongText.length)
    .reduce(
      (value, correction) =>
        value.split(correction.wrongText).join(correction.correctText),
      text,
    );
}

export function normalizeSpeechTerms(text: string, terms: string[]) {
  return terms
    .filter((term) => term.trim())
    .sort((a, b) => b.length - a.length)
    .reduce((value, term) => {
      const canonical = term.trim();
      const aliases = [canonical, toSpeechAlias(canonical)];
      return aliases.reduce((result, alias) => {
        const compact = alias.replace(/\s+/g, "");
        if (!compact) return result;
        const compactPattern = compact.split("").map(escapeRegExp).join("\\s*");
        const wordPattern = alias
          .trim()
          .split(/\s+/)
          .map(escapeRegExp)
          .join("\\s*");
        return result
          .replace(new RegExp(compactPattern, "gi"), canonical)
          .replace(new RegExp(wordPattern, "gi"), canonical);
      }, value);
    }, text);
}
