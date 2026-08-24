import { useCallback, useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { appAlert } from "@/components/AppDialog";
import { Button } from "@/components/UI";
import {
  addSpeechCorrection,
  addSpeechTerm,
  deleteSpeechCorrection,
  deleteSpeechTerm,
  listSpeechCorrections,
  listSpeechTerms,
} from "@/services/database";
import type { SpeechCorrection, SpeechTerm } from "@/types";

export default function SpeechDictionary() {
  const insets = useSafeAreaInsets();
  const [terms, setTerms] = useState<SpeechTerm[]>([]);
  const [corrections, setCorrections] = useState<SpeechCorrection[]>([]);
  const [term, setTerm] = useState("");
  const [wrongText, setWrongText] = useState("");
  const [correctText, setCorrectText] = useState("");
  const load = useCallback(async () => {
    const [nextTerms, nextCorrections] = await Promise.all([
      listSpeechTerms(),
      listSpeechCorrections(),
    ]);
    setTerms(nextTerms);
    setCorrections(nextCorrections);
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, 0);
    return () => clearTimeout(timer);
  }, [load]);

  const saveTerm = async () => {
    const value = term.trim();
    if (!value) return;
    if (terms.some((item) => item.term === value)) {
      appAlert("중복 단어", "이미 등록된 전문용어입니다.");
      return;
    }
    await addSpeechTerm(value);
    setTerm("");
    await load();
  };
  const saveCorrection = async () => {
    const wrong = wrongText.trim();
    const correct = correctText.trim();
    if (!wrong || !correct) return;
    if (corrections.some((item) => item.wrongText === wrong)) {
      appAlert("중복 표현", "이미 등록된 잘못된 표현입니다.");
      return;
    }
    await addSpeechCorrection(wrong, correct);
    setWrongText("");
    setCorrectText("");
    await load();
  };
  const removeTerm = async (id: string) => {
    await deleteSpeechTerm(id);
    await load();
  };
  const removeCorrection = async (id: string) => {
    await deleteSpeechCorrection(id);
    await load();
  };

  return (
    <KeyboardAvoidingView
      style={st.page}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={[
          st.content,
          { paddingBottom: 28 + insets.bottom },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={st.title}>음성 단어 사전</Text>
        <Text style={st.group}>전문용어</Text>
        <View style={st.card}>
          <Text style={st.description}>
            등록한 단어를 음성인식기에 힌트로 전달하여 인식될 가능성을 높입니다.
            기기와 음성인식 서비스에 따라 효과가 다를 수 있습니다.
          </Text>
          <View style={st.inputRow}>
            <TextInput
              value={term}
              onChangeText={setTerm}
              placeholder="전문용어 입력"
              style={st.input}
              returnKeyType="done"
              onSubmitEditing={saveTerm}
            />
            <View style={st.addButton}>
              <Button title="추가" onPress={saveTerm} />
            </View>
          </View>
          {terms.length === 0 ? (
            <Text style={st.empty}>등록된 전문용어가 없습니다.</Text>
          ) : (
            terms.map((item) => (
              <DictionaryRow
                key={item.id}
                label={item.term}
                onDelete={() => removeTerm(item.id)}
              />
            ))
          )}
        </View>
        <Text style={st.group}>자동교정</Text>
        <View style={st.card}>
          <Text style={st.description}>
            음성인식 결과에 잘못된 표현이 있으면 지정한 단어로 자동 변경합니다.
            실제로 사용할 수 있는 일반 단어를 등록하면 원하지 않는 경우에도 바뀔
            수 있습니다.
          </Text>
          <TextInput
            value={wrongText}
            onChangeText={setWrongText}
            placeholder="잘못 인식된 말"
            style={st.input}
            returnKeyType="next"
          />
          <TextInput
            value={correctText}
            onChangeText={setCorrectText}
            placeholder="바꿀 말"
            style={st.input}
            returnKeyType="done"
            onSubmitEditing={saveCorrection}
          />
          <Button title="자동교정 추가" onPress={saveCorrection} />
          {corrections.length === 0 ? (
            <Text style={st.empty}>등록된 자동교정 규칙이 없습니다.</Text>
          ) : (
            corrections.map((item) => (
              <DictionaryRow
                key={item.id}
                label={`${item.wrongText} → ${item.correctText}`}
                onDelete={() => removeCorrection(item.id)}
              />
            ))
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function DictionaryRow({
  label,
  onDelete,
}: {
  label: string;
  onDelete: () => void;
}) {
  return (
    <View style={st.row}>
      <Text style={st.rowText}>{label}</Text>
      <Pressable
        onPress={onDelete}
        accessibilityRole="button"
        accessibilityLabel={`${label} 삭제`}
      >
        <Text style={st.deleteText}>삭제</Text>
      </Pressable>
    </View>
  );
}

const st = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#FAF9FE" },
  content: { padding: 20, gap: 14 },
  title: { fontSize: 28, fontWeight: "900", color: "#171B27" },
  group: { fontSize: 16, fontWeight: "800", color: "#6E7585", marginTop: 8 },
  card: {
    padding: 18,
    borderRadius: 20,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E8E3F2",
    gap: 12,
  },
  description: { fontSize: 14, lineHeight: 21, color: "#747C8D" },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  input: {
    minHeight: 52,
    flex: 1,
    borderWidth: 1,
    borderColor: "#E8E3F2",
    borderRadius: 14,
    backgroundColor: "#FFF",
    paddingHorizontal: 14,
    fontSize: 16,
    color: "#171B27",
  },
  addButton: { width: 78 },
  empty: { fontSize: 14, color: "#747C8D", paddingVertical: 4 },
  row: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: "#FAF8FF",
    borderWidth: 1,
    borderColor: "#E3D9FA",
  },
  rowText: { flex: 1, fontSize: 16, fontWeight: "700", color: "#252936" },
  deleteText: { color: "#DC3B5D", fontWeight: "800", padding: 8 },
});
