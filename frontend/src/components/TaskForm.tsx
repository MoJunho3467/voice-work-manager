import { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Choice, Field, colors, s } from "./UI";
import {
  DateTimeFields,
  isValidDateTime,
  type DateTimeValue,
} from "./DateTimeFields";
import { MODE_LABEL, NOTIFICATION_MODES, STATUS_LABEL } from "../constants";
import type { ReminderDraft, TaskDraft, TaskStatus } from "../types";
import { localDateKey, toLocalIso } from "../utils/date";
import { appAlert } from "./AppDialog";
const fromIso = (iso: string): DateTimeValue => {
  const value = new Date(iso);
  return {
    date: localDateKey(value),
    hour: value.getHours(),
    minute: value.getMinutes(),
  };
};
const defaultReminder = (task: DateTimeValue): ReminderDraft => ({
  scheduledAt: new Date(
    new Date(toLocalIso(task.date, task.hour, task.minute)).getTime() -
      10 * 60000,
  ).toISOString(),
  mode: "normal",
});
const dueReminder = (
  task: DateTimeValue,
  mode: ReminderDraft["mode"] = "normal",
): ReminderDraft => ({
  scheduledAt: new Date(
    toLocalIso(task.date, task.hour, task.minute),
  ).toISOString(),
  mode,
  offsetMinutes: 0,
});
const initialReminderRules = (
  task: DateTimeValue,
  reminders?: ReminderDraft[],
) => {
  const taskIso = toLocalIso(task.date, task.hour, task.minute);
  if (!reminders) return [dueReminder(task), defaultReminder(task)];
  const due = reminders.find(
    (rule) =>
      rule.offsetMinutes === 0 ||
      new Date(rule.scheduledAt).getTime() === new Date(taskIso).getTime(),
  );
  const advance = reminders.filter((rule) => rule !== due);
  return [
    dueReminder(task, due?.mode ?? "normal"),
    ...advance.map((rule) => ({ ...rule })),
  ];
};
const fullDateTime = (iso: string) =>
  new Date(iso).toLocaleString("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  });
export function TaskForm({
  initial,
  onSubmit,
  submitLabel = "일정 저장",
}: {
  initial?: Partial<TaskDraft>;
  onSubmit: (draft: TaskDraft) => Promise<void>;
  submitLabel?: string;
}) {
  const insets = useSafeAreaInsets();
  const initialTask = fromIso(initial?.scheduledAt ?? new Date().toISOString());
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [status, setStatus] = useState<TaskStatus>(
    initial?.status ?? "PENDING",
  );
  const [taskTime, setTaskTime] = useState<DateTimeValue>(initialTask);
  const [rules, setRules] = useState<ReminderDraft[]>(() =>
    initialReminderRules(initialTask, initial?.reminders),
  );
  const [editingRule, setEditingRule] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const taskIso = useMemo(
    () =>
      isValidDateTime(taskTime)
        ? toLocalIso(taskTime.date, taskTime.hour, taskTime.minute)
        : "",
    [taskTime],
  );
  const changeTaskTime = (value: DateTimeValue) => {
    const previousIso = isValidDateTime(taskTime)
      ? toLocalIso(taskTime.date, taskTime.hour, taskTime.minute)
      : "";
    const nextIso = isValidDateTime(value)
      ? toLocalIso(value.date, value.hour, value.minute)
      : "";
    setTaskTime(value);
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
  const addRule = () => {
    if (!taskIso)
      return appAlert("확인", "일정 날짜와 시간을 먼저 확인해주세요.");
    const index = rules.length;
    setRules((current) => [...current, defaultReminder(taskTime)]);
    setEditingRule(index);
  };
  const removeRule = (index: number) => {
    if (index === 0) return;
    setRules((current) => current.filter((_, i) => i !== index));
    setEditingRule(null);
  };
  const save = async () => {
    if (!title.trim()) return appAlert("확인", "일정 제목을 입력해주세요.");
    if (!taskIso) return appAlert("확인", "일정 날짜와 시간을 확인해주세요.");
    if (rules.some((r) => new Date(r.scheduledAt).getTime() <= Date.now()))
      return appAlert(
        "알림 시간 확인",
        "과거인 알림 시간은 저장할 수 없습니다.",
      );
    if (
      rules.some(
        (r) => new Date(r.scheduledAt).getTime() > new Date(taskIso).getTime(),
      )
    )
      return appAlert("알림 시간 확인", "일정 이후인 알림 시간이 있습니다.");
    setBusy(true);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        scheduledAt: taskIso,
        status,
        category: initial?.category ?? "업무",
        reminderMinutes: null,
        repeat: initial?.repeat ?? null,
        reminders: rules.map((r) => ({
          ...r,
          offsetMinutes: Math.round(
            (new Date(taskIso).getTime() - new Date(r.scheduledAt).getTime()) /
              60000,
          ),
        })),
      });
    } catch (error) {
      appAlert(
        "저장 실패",
        error instanceof Error ? error.message : "오류가 발생했습니다.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={[
        form.content,
        { paddingTop: 18 + insets.top, paddingBottom: 28 + insets.bottom },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <View>
        <View style={form.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="뒤로가기"
            onPress={() => router.back()}
            style={form.backButton}
          >
            <Text style={form.backText}>‹</Text>
          </Pressable>
          <Text style={form.pageTitle}>일정 등록/수정</Text>
          <View style={form.headerSpacer} />
        </View>
        <Text style={form.guide}>일정 내용을 입력하세요</Text>
      </View>
      <View style={form.section}>
        <Text style={form.sectionTitle}>기본 정보</Text>
        <Field label="일정 제목">
          <TextInput
            value={title}
            onChangeText={setTitle}
            style={s.input}
            placeholder="예: 거래처 방문"
          />
        </Field>
        <DateTimeFields
          label="일정 날짜·시간"
          value={taskTime}
          onChange={changeTaskTime}
        />
        <Field label="메모">
          <TextInput
            value={description}
            onChangeText={setDescription}
            style={[s.input, form.memo]}
            placeholder="필요한 내용을 입력하세요"
            multiline
          />
        </Field>
      </View>
      <View style={form.section}>
        <Text style={form.sectionTitle}>알림</Text>
        {rules.length === 0 ? (
          <Text style={s.muted}>등록된 알림이 없습니다.</Text>
        ) : (
          rules.map((rule, index) => (
            <View key={"reminder-" + index} style={form.reminder}>
              <View style={form.summaryRow}>
                <View style={form.summaryText}>
                  <Text style={form.reminderTitle}>
                    {index === 0 ? "일정 시작 알림" : `사전 알림 ${index}`}
                  </Text>
                  <Text style={form.actualTime}>
                    {fullDateTime(rule.scheduledAt)}
                  </Text>
                  <Text style={form.modeText}>{MODE_LABEL[rule.mode]}</Text>
                </View>
                <View style={form.summaryActions}>
                  <Pressable
                    style={form.editButton}
                    onPress={() =>
                      setEditingRule(editingRule === index ? null : index)
                    }
                  >
                    <Text style={form.editButtonText}>
                      {editingRule === index ? "닫기" : "수정"}
                    </Text>
                  </Pressable>
                  {index !== 0 && (
                    <Pressable
                      style={form.deleteButton}
                      onPress={() => removeRule(index)}
                    >
                      <Text style={form.deleteButtonText}>삭제</Text>
                    </Pressable>
                  )}
                </View>
              </View>
              {editingRule === index && (
                <View style={form.editor}>
                  {index !== 0 && (
                    <DateTimeFields
                      label="알림 날짜·시간"
                      value={fromIso(rule.scheduledAt)}
                      onChange={(value) => {
                        if (isValidDateTime(value))
                          updateRule(index, {
                            scheduledAt: new Date(
                              toLocalIso(value.date, value.hour, value.minute),
                            ).toISOString(),
                          });
                      }}
                    />
                  )}
                  <Choice
                    label="알림 방식"
                    items={NOTIFICATION_MODES.map((item) => ({
                      label: item.label,
                      value: item.value,
                    }))}
                    value={rule.mode}
                    onChange={(mode) => updateRule(index, { mode })}
                  />
                  <Pressable
                    style={form.doneButton}
                    onPress={() => setEditingRule(null)}
                  >
                    <Text style={form.doneButtonText}>수정 완료</Text>
                  </Pressable>
                </View>
              )}
            </View>
          ))
        )}
        <Pressable style={form.addButton} onPress={addRule}>
          <Text style={form.addButtonText}>＋ 알림 추가</Text>
        </Pressable>
      </View>
      <View style={form.section}>
        <Choice
          label="일정 상태"
          items={(Object.keys(STATUS_LABEL) as TaskStatus[]).map((value) => ({
            label: STATUS_LABEL[value],
            value,
          }))}
          value={status}
          onChange={setStatus}
        />
        <Text style={s.muted}>
          {rules.length
            ? rules.length +
              "회 · " +
              rules.map((r) => MODE_LABEL[r.mode]).join(", ")
            : "알림 없음"}
        </Text>
      </View>
      <Button
        title={busy ? "저장 중…" : submitLabel}
        disabled={busy}
        onPress={save}
      />
    </ScrollView>
  );
}
const form = StyleSheet.create({
  content: { padding: 18, gap: 16, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  backText: {
    color: colors.primary,
    fontSize: 34,
    lineHeight: 36,
    fontWeight: "500",
    marginTop: -3,
  },
  headerSpacer: { width: 42 },
  pageTitle: { fontSize: 27, fontWeight: "900", color: colors.text },
  guide: {
    fontSize: 15,
    color: colors.primary,
    fontWeight: "800",
    marginTop: 8,
    textAlign: "center",
  },
  section: {
    backgroundColor: "#FFF",
    borderRadius: 22,
    padding: 18,
    gap: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: { fontSize: 22, fontWeight: "900", color: colors.text },
  memo: { minHeight: 110, textAlignVertical: "top", paddingTop: 15 },
  reminder: {
    backgroundColor: "#FBF9FF",
    borderRadius: 18,
    padding: 15,
    gap: 14,
    borderWidth: 1,
    borderColor: "#DED4FA",
  },
  summaryRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  summaryText: { flex: 1, gap: 5 },
  reminderTitle: { fontSize: 16, fontWeight: "900", color: colors.primary },
  actualTime: { fontSize: 17, fontWeight: "900", color: colors.text },
  modeText: { fontSize: 14, fontWeight: "800", color: colors.muted },
  summaryActions: { flexDirection: "row", gap: 8 },
  editButton: {
    paddingHorizontal: 13,
    paddingVertical: 11,
    borderRadius: 13,
    backgroundColor: "#EEE8FF",
  },
  editButtonText: { fontSize: 14, fontWeight: "900", color: colors.primary },
  deleteButton: {
    paddingHorizontal: 13,
    paddingVertical: 11,
    borderRadius: 13,
    backgroundColor: "#FFF0F2",
  },
  deleteButtonText: { fontSize: 14, fontWeight: "900", color: colors.danger },
  editor: {
    paddingTop: 14,
    gap: 14,
    borderTopWidth: 1,
    borderTopColor: "#E7DFF8",
  },
  doneButton: {
    padding: 14,
    borderRadius: 14,
    alignItems: "center",
    backgroundColor: colors.primary,
  },
  doneButtonText: { color: "#FFF", fontWeight: "900" },
  addButton: {
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: "#D7C9FA",
  },
  addButtonText: { fontSize: 16, fontWeight: "900", color: colors.primary },
});
