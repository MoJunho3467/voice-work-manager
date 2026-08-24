import { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { parseKoreanSchedule } from "@/parser/scheduleParser";
import { Button, Choice, colors, s } from "@/components/UI";
import {
  DateTimeFields,
  isValidDateTime,
  type DateTimeValue,
} from "@/components/DateTimeFields";
import { localDateKey, toLocalIso } from "@/utils/date";
import { useTasks } from "@/context/TaskContext";
import { getSettings } from "@/services/database";
import { MODE_LABEL, NOTIFICATION_MODES } from "@/constants";
import type { ReminderDraft } from "@/types";
import { materializeReminders, withDueReminder } from "@/utils/reminders";
import { appAlert } from "@/components/AppDialog";
const fromIso = (iso: string): DateTimeValue => {
  const value = new Date(iso);
  return {
    date: localDateKey(value),
    hour: value.getHours(),
    minute: value.getMinutes(),
  };
};
const fullDateTime = (iso: string) =>
  new Date(iso).toLocaleString("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  });
export default function Confirm() {
  const { text = "" } = useLocalSearchParams<{
    text: string;
  }>();
  const parsed = useMemo(() => parseKoreanSchedule(text), [text]);
  const initialTask: DateTimeValue = {
    date: parsed.date ?? localDateKey(),
    hour: parsed.hour ?? 9,
    minute: parsed.minute ?? 0,
  };
  const initialIso = toLocalIso(
    initialTask.date,
    initialTask.hour,
    initialTask.minute,
  );
  const [title, setTitle] = useState(parsed.title);
  const [taskTime, setTaskTime] = useState(initialTask);
  const [pmChosen, setPmChosen] = useState(!parsed.ambiguousMeridiem);
  const [rules, setRules] = useState<ReminderDraft[]>(
    materializeReminders(initialIso, parsed.reminders),
  );
  const [editingRule, setEditingRule] = useState<number | null>(null);
  const { create } = useTasks();
  useEffect(() => {
    if (!parsed.hasExplicitReminder)
      getSettings().then((settings) =>
        setRules(
          materializeReminders(
            initialIso,
            withDueReminder(
              [
                {
                  offsetMinutes: settings.defaultOffsetMinutes,
                  mode: settings.defaultMode,
                },
              ],
              settings.defaultMode,
            ),
          ),
        ),
      );
  }, [parsed.hasExplicitReminder, initialIso]);
  const scheduledAt = isValidDateTime(taskTime)
    ? toLocalIso(taskTime.date, taskTime.hour, taskTime.minute)
    : "";
  const changeTaskTime = (value: DateTimeValue) => {
    const previousIso = isValidDateTime(taskTime)
      ? toLocalIso(taskTime.date, taskTime.hour, taskTime.minute)
      : "";
    const nextIso = isValidDateTime(value)
      ? toLocalIso(value.date, value.hour, value.minute)
      : "";
    setTaskTime(value);
    setPmChosen(true);
    if (previousIso && nextIso) {
      const delta =
        new Date(nextIso).getTime() - new Date(previousIso).getTime();
      setRules((current) =>
        current.map((rule) => ({
          ...rule,
          scheduledAt: new Date(
            new Date(rule.scheduledAt).getTime() + delta,
          ).toISOString(),
        })),
      );
    }
  };
  const updateRule = (index: number, patch: Partial<ReminderDraft>) =>
    setRules((current) =>
      current.map((rule, i) => (i === index ? { ...rule, ...patch } : rule)),
    );
  const removeRule = (index: number) => {
    const rule = rules[index];
    const dueTime =
      !!scheduledAt &&
      new Date(rule?.scheduledAt ?? 0).getTime() ===
        new Date(scheduledAt).getTime();
    if (rule?.offsetMinutes === 0 || dueTime) return;
    setRules((current) => current.filter((_, i) => i !== index));
    setEditingRule((current) => (current === index ? null : current));
  };
  const addRule = () => {
    if (!scheduledAt)
      return appAlert("확인", "일정 날짜와 시간을 먼저 확인해주세요.");
    setRules((current) => {
      const next = [
        ...current,
        {
          scheduledAt: new Date(
            new Date(scheduledAt).getTime() - 10 * 60000,
          ).toISOString(),
          mode: "normal" as const,
        },
      ];
      setEditingRule(next.length - 1);
      return next;
    });
  };
  const save = async () => {
    if (!title.trim()) return appAlert("확인", "업무 제목을 입력해주세요.");
    if (!scheduledAt)
      return appAlert("확인", "일정 날짜와 시간을 확인해주세요.");
    if (parsed.ambiguousMeridiem && !pmChosen)
      return appAlert("확인", "오전 또는 오후를 선택해주세요.");
    if (
      rules.some((rule) => new Date(rule.scheduledAt).getTime() <= Date.now())
    )
      return appAlert(
        "알림 시간 확인",
        "과거인 알림 시간을 수정하거나 삭제해주세요.",
      );
    const task = await create({
      title: title.trim(),
      description: `음성 인식 원문: ${text}`,
      scheduledAt,
      status: "PENDING",
      category: "업무",
      reminderMinutes: null,
      repeat: parsed.repeat,
      reminders: rules.map((rule) => ({
        ...rule,
        offsetMinutes: Math.round(
          (new Date(scheduledAt).getTime() -
            new Date(rule.scheduledAt).getTime()) /
            60000,
        ),
      })),
    });
    router.replace(`/task/${task.id}`);
  };
  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={page.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={s.card}>
        <Text style={s.label}>인식된 원문</Text>
        <Text style={s.body}>{text}</Text>
      </View>
      {[
        ...parsed.missing.map(
          (item) =>
            `분석하지 못한 항목: ${{ date: "날짜", time: "시간", title: "제목" }[item]}`,
        ),
        ...parsed.warnings,
      ].map((warning) => (
        <View key={warning} style={[s.card, { borderColor: "#F59E0B" }]}>
          <Text style={{ color: "#92400E", fontWeight: "700" }}>{warning}</Text>
        </View>
      ))}
      <Text style={s.label}>업무 제목</Text>
      <TextInput style={s.input} value={title} onChangeText={setTitle} />
      {parsed.ambiguousMeridiem && !pmChosen && (
        <View style={[s.card, { gap: 10 }]}>
          <Text style={{ color: colors.danger, fontWeight: "700" }}>
            오전/오후가 불명확합니다.
          </Text>
          <View style={s.row}>
            {["오전", "오후"].map((label, index) => (
              <Pressable
                key={label}
                onPress={() => {
                  setPmChosen(true);
                  setTaskTime((current) => ({
                    ...current,
                    hour: (current.hour % 12) + (index === 1 ? 12 : 0),
                  }));
                  setRules((current) =>
                    current.map((rule) => ({
                      ...rule,
                      scheduledAt: new Date(
                        new Date(rule.scheduledAt).getTime() +
                          (index === 1 ? 12 : 0) * 3600000,
                      ).toISOString(),
                    })),
                  );
                }}
                style={s.choice}
              >
                <Text style={s.choiceText}>{label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}
      <DateTimeFields
        label="일정 날짜·시간"
        value={taskTime}
        onChange={changeTaskTime}
      />

      <View style={page.reminderSection}>
        <View style={page.reminderHeader}>
          <View>
            <Text style={s.h2}>실제 알림 시간</Text>
            <Text style={s.muted}>{rules.length}개의 알림</Text>
          </View>
          <Pressable style={page.addSmall} onPress={addRule}>
            <Text style={page.addSmallText}>＋ 추가</Text>
          </Pressable>
        </View>
        {rules.length === 0 ? (
          <Text style={s.muted}>알림 없음</Text>
        ) : (
          rules.map((rule, index) => {
            const editing = editingRule === index;
            const dueTime =
              !!scheduledAt &&
              new Date(rule.scheduledAt).getTime() ===
                new Date(scheduledAt).getTime();
            const isDue = rule.offsetMinutes === 0 || dueTime;
            const advanceNumber = rules
              .slice(0, index + 1)
              .filter((candidate) => {
                const candidateDueTime =
                  !!scheduledAt &&
                  new Date(candidate.scheduledAt).getTime() ===
                    new Date(scheduledAt).getTime();
                return candidate.offsetMinutes !== 0 && !candidateDueTime;
              }).length;
            return (
              <View
                key={`${rule.scheduledAt}-${index}`}
                style={page.reminderCard}
              >
                <View style={page.summaryRow}>
                  <View style={{ flex: 1, gap: 5 }}>
                    <Text style={page.reminderName}>
                      {isDue ? "일정 시작 알림" : `사전 알림 ${advanceNumber}`}
                    </Text>
                    <Text style={page.reminderTime}>
                      {fullDateTime(rule.scheduledAt)}
                    </Text>
                    <Text style={page.mode}>{MODE_LABEL[rule.mode]}</Text>
                  </View>
                  <Pressable
                    style={page.editButton}
                    onPress={() => setEditingRule(editing ? null : index)}
                  >
                    <Text style={page.editText}>
                      {editing ? "접기" : "수정"}
                    </Text>
                  </Pressable>
                  {!isDue && (
                    <Pressable
                      style={page.deleteButton}
                      onPress={() => removeRule(index)}
                    >
                      <Text style={page.deleteText}>삭제</Text>
                    </Pressable>
                  )}
                </View>
                {editing && (
                  <View style={page.editor}>
                    {!isDue && (
                      <DateTimeFields
                        label="알림 날짜·시간"
                        value={fromIso(rule.scheduledAt)}
                        onChange={(value) => {
                          if (isValidDateTime(value))
                            updateRule(index, {
                              scheduledAt: new Date(
                                toLocalIso(
                                  value.date,
                                  value.hour,
                                  value.minute,
                                ),
                              ).toISOString(),
                            });
                        }}
                      />
                    )}
                    <Choice
                      label="방식"
                      items={NOTIFICATION_MODES.map((item) => ({
                        label: item.label,
                        value: item.value,
                      }))}
                      value={rule.mode}
                      onChange={(mode) => updateRule(index, { mode })}
                    />
                  </View>
                )}
              </View>
            );
          })
        )}
      </View>
      <Button title="이 내용으로 등록" onPress={save} />
      <Button
        title="다시 말하기"
        variant="secondary"
        onPress={() => router.back()}
      />
      <Button
        title="취소"
        variant="secondary"
        onPress={() => router.dismiss()}
      />
    </ScrollView>
  );
}
const page = StyleSheet.create({
  content: { padding: 18, paddingBottom: 40, gap: 16 },
  reminderSection: {
    backgroundColor: "#FFF",
    borderRadius: 22,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: "#E8E3F2",
  },
  reminderHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  addSmall: {
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: "#F1ECFF",
  },
  addSmallText: { color: "#6336D8", fontWeight: "900" },
  reminderCard: {
    borderWidth: 1,
    borderColor: "#E3D9FA",
    borderRadius: 16,
    backgroundColor: "#FBF9FF",
    padding: 13,
    gap: 12,
  },
  summaryRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  reminderName: { fontSize: 14, fontWeight: "900", color: "#7047E8" },
  reminderTime: { fontSize: 16, fontWeight: "900", color: "#202330" },
  mode: { fontSize: 13, fontWeight: "800", color: "#747C8D" },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 11,
    backgroundColor: "#EEE7FF",
  },
  editText: { color: "#6034D9", fontWeight: "900" },
  deleteButton: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 11,
    backgroundColor: "#FFF0F2",
  },
  deleteText: { color: "#C23B4A", fontWeight: "900" },
  editor: { gap: 12, paddingTop: 4 },
});
