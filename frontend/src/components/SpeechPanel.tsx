import { useEffect, useState } from "react";
import { Modal, Text, TextInput, View } from "react-native";
import { Button, colors, s } from "./UI";
import type { SpeechState } from "../hooks/useSpeechInput";

const labels: Record<SpeechState, string> = {
  idle: "메모 작성",
  listening: "듣는 중…",
  processing: "처리 중…",
  completed: "내용을 확인해주세요",
  failed: "음성 인식 실패",
};

export function SpeechPanel({
  visible,
  state,
  error,
  transcript,
  onStart,
  finish,
  onCancel,
  onSave,
  title = "메모 작성",
  saveLabel = "메모 저장",
}: {
  visible: boolean;
  state: SpeechState;
  error: string;
  transcript: string;
  onStart: () => void;
  finish: () => void;
  onCancel: () => void;
  onSave: (text: string) => void;
  title?: string;
  saveLabel?: string;
}) {
  const [text, setText] = useState("");

  useEffect(() => {
    if (visible) setText(transcript);
  }, [transcript, visible]);

  useEffect(() => {
    if (!visible) setText("");
  }, [visible]);

  const save = () => {
    const value = text.trim();
    if (value) onSave(value);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "#0008",
          justifyContent: "center",
          padding: 22,
        }}
      >
        <View style={[s.card, { gap: 15 }]}>
          <Text style={s.h2}>{state === "idle" ? title : labels[state]}</Text>
          {state === "listening" && (
            <View
              style={{
                width: 76,
                height: 76,
                borderRadius: 38,
                backgroundColor: "#E9E0FF",
                alignSelf: "center",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 38 }}>🎙️</Text>
            </View>
          )}
          <TextInput
            style={[s.input, { minHeight: 120, textAlignVertical: "top" }]}
            value={text}
            multiline
            placeholder="내용 입력"
            onChangeText={setText}
          />
          {!!error && <Text style={{ color: colors.danger }}>{error}</Text>}
          <Button
            title={state === "listening" ? "말하기 완료" : "다시 말하기"}
            onPress={state === "listening" ? finish : onStart}
          />
          <Button title={saveLabel} onPress={save} />
          <Button title="취소" variant="secondary" onPress={onCancel} />
        </View>
      </View>
    </Modal>
  );
}
