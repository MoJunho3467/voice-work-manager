import { useCallback, useState } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Button, ScreenLoading, s } from "@/components/UI";
import { appAlert } from "@/components/AppDialog";
import { useTasks } from "@/context/TaskContext";
import { addMemo, getTask, listMemos } from "@/services/database";
import type { Task, TaskMemo } from "@/types";
import { formatDateTime } from "@/utils/date";
import { MODE_LABEL, STATUS_LABEL } from "@/constants";
import { useSpeechInput } from "@/hooks/useSpeechInput";
import { SpeechPanel } from "@/components/SpeechPanel";

export default function Detail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { remove, complete } = useTasks();
  const [task, setTask] = useState<Task | null>(null);
  const [memos, setMemos] = useState<TaskMemo[]>([]);
  const [text, setText] = useState("");
  const [show, setShow] = useState(false);
  const load = useCallback(async () => {
    setTask(await getTask(id));
    setMemos(await listMemos(id));
  }, [id]);
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );
  const speech = useSpeechInput();
  if (!task) return <ScreenLoading />;
  const saveMemo = async (content: string, type: "TEXT" | "VOICE") => {
    if (!content.trim()) return;
    await addMemo(id, content.trim(), type);
    setText("");
    await load();
  };
  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={s.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={[s.card, { gap: 8 }]}>
        <Text style={s.title}>{task.title}</Text>
        <Text style={s.body}>{formatDateTime(task.scheduledAt)}</Text>
        <Text style={s.muted}>{STATUS_LABEL[task.status]}</Text>
        {!!task.description && <Text style={s.body}>{task.description}</Text>}
      </View>
      <View style={[s.card, { gap: 8 }]}>
        <Text style={s.h2}>알림 시간</Text>
        {task.reminders.length === 0 ? (
          <Text style={s.muted}>알림 없음</Text>
        ) : (
          task.reminders.map((r) => (
            <View key={r.id}>
              <Text style={s.body}>
                {new Date(r.scheduledAt).toLocaleString("ko-KR")}
              </Text>
              <Text style={s.muted}>{MODE_LABEL[r.mode]}</Text>
            </View>
          ))
        )}
      </View>
      {task.status !== "COMPLETED" && (
        <Button
          title="✓ 업무 완료 처리"
          onPress={async () => {
            await complete(task);
            await load();
          }}
        />
      )}
      <View style={s.row}>
        <View style={{ flex: 1 }}>
          <Button
            title="수정"
            variant="secondary"
            onPress={() =>
              router.push({ pathname: "/task/edit", params: { id } })
            }
          />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            title="삭제"
            variant="danger"
            onPress={() =>
              appAlert("업무 삭제", "메모도 함께 삭제됩니다.", [
                { text: "취소", style: "cancel" },
                {
                  text: "삭제",
                  style: "destructive",
                  onPress: async () => {
                    await remove(id);
                    router.replace("/");
                  },
                },
              ])
            }
          />
        </View>
      </View>
      <Text style={s.h2}>업무 메모</Text>
      <View style={[s.card, { gap: 10 }]}>
        <TextInput
          value={text}
          onChangeText={setText}
          multiline
          style={[s.input, { minHeight: 90, textAlignVertical: "top" }]}
          placeholder="메모를 입력하세요."
        />
        <Button
          title="텍스트 메모 추가"
          variant="secondary"
          onPress={() => saveMemo(text, "TEXT")}
        />
        <Button
          title="🎙️ 음성 메모 추가"
          onPress={() => {
            setShow(true);
            speech.start();
          }}
        />
      </View>
      {memos.length === 0 ? (
        <Text style={[s.muted, s.card]}>아직 작성된 메모가 없습니다.</Text>
      ) : (
        memos.map((m) => (
          <View key={m.id} style={s.card}>
            <Text style={s.body}>{m.content}</Text>
            <Text style={s.muted}>
              {new Date(m.createdAt).toLocaleString("ko-KR")} ·{" "}
              {m.inputType === "VOICE" ? "음성" : "텍스트"}
            </Text>
          </View>
        ))
      )}
      <SpeechPanel
        visible={show}
        {...speech}
        onStart={speech.start}
        onCancel={() => {
          speech.cancel();
          setShow(false);
        }}
        onSave={async (value) => {
          speech.cancel();
          setShow(false);
          await saveMemo(value, "VOICE");
        }}
      />
    </ScrollView>
  );
}
