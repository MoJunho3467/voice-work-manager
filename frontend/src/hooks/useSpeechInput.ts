import { useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "expo-speech-recognition";
import { listSpeechCorrections, listSpeechTerms } from "@/services/database";
import type { SpeechCorrection } from "@/types";
import {
  applySpeechCorrections,
  mergeTranscript,
  normalizeSpeechTerms,
} from "@/utils/speech";

export type SpeechState =
  | "idle"
  | "listening"
  | "processing"
  | "completed"
  | "failed";
const SILENCE_MS = 5000;

export {
  applySpeechCorrections,
  mergeTranscript,
  normalizeSpeechTerms,
} from "@/utils/speech";

export function useSpeechInput(onResult?: (text: string) => void) {
  const [state, setState] = useState<SpeechState>("idle");
  const [error, setError] = useState("");
  const [transcript, setTranscript] = useState("");
  const active = useRef(false),
    finishing = useRef(false),
    cancelled = useRef(false),
    delivered = useRef(false),
    restartPending = useRef(false),
    correctionsRef = useRef<SpeechCorrection[]>([]),
    termsRef = useRef<string[]>([]);
  const finalRef = useRef(""),
    interimRef = useRef(""),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rawFullText = () =>
    [finalRef.current.trim(), interimRef.current.trim()]
      .filter(Boolean)
      .join(" ")
      .trim();
  const fullText = () =>
    applySpeechCorrections(
      normalizeSpeechTerms(rawFullText(), termsRef.current),
      correctionsRef.current,
    );
  const clearTimer = () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  };
  const deliver = () => {
    if (delivered.current) return;
    delivered.current = true;
    clearTimer();
    active.current = false;
    const text = fullText();
    if (text) {
      setTranscript(text);
      setState("completed");
      onResult?.(text);
    } else {
      setError("음성이 인식되지 않았습니다.");
      setState("failed");
    }
  };
  const finish = () => {
    if (!active.current) return;
    finishing.current = true;
    setState("processing");
    clearTimer();
    ExpoSpeechRecognitionModule.stop();
  };
  const resetSilence = () => {
    clearTimer();
    timer.current = setTimeout(finish, SILENCE_MS);
  };
  const beginSession = () => {
    active.current = true;
    ExpoSpeechRecognitionModule.start({
      lang: "ko-KR",
      interimResults: true,
      continuous: true,
      maxAlternatives: 1,
      requiresOnDeviceRecognition: false,
      contextualStrings: termsRef.current,
    });
  };
  useSpeechRecognitionEvent("result", (e) => {
    const next = e.results[0]?.transcript?.trim();
    if (!next) return;
    if (e.isFinal) {
      finalRef.current = mergeTranscript(finalRef.current, next);
      interimRef.current = "";
    } else {
      interimRef.current = next;
    }
    setTranscript(fullText());
    resetSilence();
  });
  useSpeechRecognitionEvent("end", () => {
    if (cancelled.current || delivered.current || restartPending.current)
      return;
    if (finishing.current) {
      active.current = false;
      finishing.current = false;
      deliver();
      return;
    }
    if (!active.current) return;
    active.current = false;
    interimRef.current = "";
    restartPending.current = true;
    setTimeout(() => {
      restartPending.current = false;
      if (cancelled.current || delivered.current) return;
      try {
        beginSession();
      } catch {
        deliver();
      }
    }, 0);
  });
  useSpeechRecognitionEvent("error", (e) => {
    if (cancelled.current) return;
    active.current = false;
    clearTimer();
    setError(e.message || "음성 인식 오류가 발생했습니다.");
    setState("failed");
  });
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => {
      if (s !== "active" && active.current) {
        cancelled.current = true;
        ExpoSpeechRecognitionModule.abort();
        active.current = false;
        clearTimer();
        setState("idle");
      }
    });
    return () => {
      sub.remove();
      clearTimer();
    };
  }, []);
  const start = async () => {
    if (active.current) return;
    setError("");
    setTranscript("");
    finalRef.current = "";
    interimRef.current = "";
    cancelled.current = false;
    finishing.current = false;
    delivered.current = false;
    restartPending.current = false;
    correctionsRef.current = [];
    termsRef.current = [];
    try {
      if (!ExpoSpeechRecognitionModule.isRecognitionAvailable())
        throw new Error("이 기기는 음성 인식을 지원하지 않습니다.");
      const p = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!p.granted)
        throw new Error("마이크 또는 음성 인식 권한이 거부되었습니다.");
      try {
        const [terms, corrections] = await Promise.all([
          listSpeechTerms(),
          listSpeechCorrections(),
        ]);
        termsRef.current = terms.map((item) => item.term);
        correctionsRef.current = corrections;
      } catch {
        termsRef.current = [];
        correctionsRef.current = [];
      }
      if (cancelled.current) return;
      setState("listening");
      beginSession();
      resetSilence();
    } catch (e) {
      active.current = false;
      setError(
        e instanceof Error ? e.message : "음성 인식을 시작할 수 없습니다.",
      );
      setState("failed");
    }
  };
  const cancel = () => {
    cancelled.current = true;
    clearTimer();
    if (active.current) ExpoSpeechRecognitionModule.abort();
    active.current = false;
    restartPending.current = false;
    finalRef.current = "";
    interimRef.current = "";
    correctionsRef.current = [];
    termsRef.current = [];
    setTranscript("");
    setState("idle");
  };
  return { state, error, transcript, start, finish, cancel };
}
