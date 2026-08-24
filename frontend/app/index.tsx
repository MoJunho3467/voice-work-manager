import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Calendar, LocaleConfig } from "react-native-calendars";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTasks } from "@/context/TaskContext";
import { localDateKey, taskDateKey } from "@/utils/date";
import { TaskCard } from "@/components/TaskCard";
import { BottomNav } from "@/components/BottomNav";
import { ScreenLoading } from "@/components/UI";
import { useSpeechInput } from "@/hooks/useSpeechInput";
import { SpeechPanel } from "@/components/SpeechPanel";
import { appAlert } from "@/components/AppDialog";
import { CollapsibleCalendar } from "@/components/CollapsibleCalendar";

LocaleConfig.locales.ko = {
  monthNames: [
    "1월",
    "2월",
    "3월",
    "4월",
    "5월",
    "6월",
    "7월",
    "8월",
    "9월",
    "10월",
    "11월",
    "12월",
  ],
  monthNamesShort: [],
  dayNames: [
    "일요일",
    "월요일",
    "화요일",
    "수요일",
    "목요일",
    "금요일",
    "토요일",
  ],
  dayNamesShort: ["일", "월", "화", "수", "목", "금", "토"],
  today: "오늘",
};
LocaleConfig.defaultLocale = "ko";

export default function Schedule() {
  const insets = useSafeAreaInsets();
  const { tasks, loading, complete } = useTasks();
  const [selected, setSelected] = useState(localDateKey());
  const [calendarView, setCalendarView] = useState(true);
  const [showSpeech, setShowSpeech] = useState(false);
  const speech = useSpeechInput();
  const marked = useMemo(() => {
    const m: Record<string, any> = {};
    for (const t of tasks) {
      const k = taskDateKey(t.scheduledAt);
      m[k] = {
        marked: true,
        dotColor: t.status === "COMPLETED" ? "#A98EEB" : "#7047E8",
      };
    }
    m[selected] = {
      ...(m[selected] ?? {}),
      selected: true,
      selectedColor: "#7047E8",
    };
    return m;
  }, [tasks, selected]);
  if (loading) return <ScreenLoading />;
  const selectedTasks = tasks.filter(
    (t) => taskDateKey(t.scheduledAt) === selected,
  );
  const todayTasks = tasks.filter(
    (t) => taskDateKey(t.scheduledAt) === localDateKey(),
  );
  const done = todayTasks.filter((t) => t.status === "COMPLETED").length;
  const label =
    selected === localDateKey()
      ? "오늘 일정"
      : `${Number(selected.slice(5, 7))}월 ${Number(selected.slice(8, 10))}일 일정`;
  const startSpeech = () => {
    setShowSpeech(true);
    speech.start();
  };
  return (
    <View style={styles.page}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: 18 + insets.top, paddingBottom: 110 + insets.bottom },
        ]}
      >
        <View style={styles.heading}>
          <Text style={styles.title}>일정</Text>
          <View style={styles.headingActions}>
            <Pressable
              style={styles.today}
              onPress={() => setSelected(localDateKey())}
            >
              <Text style={styles.todayText}>오늘</Text>
            </Pressable>
          </View>
        </View>
        <View style={styles.progress}>
          <Text style={styles.progressTitle}>
            오늘 일정　{done}/{todayTasks.length} 완료
          </Text>
          <View style={styles.track}>
            <View
              style={[
                styles.fill,
                {
                  width: `${todayTasks.length ? (done / todayTasks.length) * 100 : 0}%`,
                },
              ]}
            />
          </View>
        </View>
        <CollapsibleCalendar
          selected={selected}
          expanded={calendarView}
          markedDates={marked}
          onDayPress={(day) => setSelected(day.dateString)}
          onExpandedChange={(expanded) => {
            if (!expanded) setSelected(localDateKey());
            setCalendarView(expanded);
          }}
          theme={{
            todayTextColor: "#7047E8",
            arrowColor: "#7047E8",
            textDayFontSize: 16,
            textMonthFontSize: 21,
            textMonthFontWeight: "800",
            selectedDayBackgroundColor: "#7047E8",
          }}
        />
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>{label}</Text>
          <Pressable
            style={styles.plusSmall}
            onPress={() =>
              router.push({
                pathname: "/task/edit",
                params: { date: selected },
              })
            }
          >
            <Text style={styles.plusText}>＋</Text>
          </Pressable>
        </View>
        {selectedTasks.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🗓️</Text>
            <Text style={styles.emptyTitle}>등록된 일정이 없습니다</Text>
            <Text style={styles.emptyText}>
              ＋ 버튼이나 음성으로 일정을 추가해보세요.
            </Text>
          </View>
        ) : (
          selectedTasks.map((t) => (
            <TaskCard
              key={t.id}
              task={t}
              onPress={() => router.push(`/task/${t.id}`)}
              onComplete={() => {
                if (t.status !== "COMPLETED")
                  appAlert("일정 완료", `“${t.title}”을 완료 처리할까요?`, [
                    { text: "취소", style: "cancel" },
                    { text: "완료", onPress: () => complete(t) },
                  ]);
              }}
            />
          ))
        )}
      </ScrollView>
      <Pressable
        style={[styles.mic, { bottom: 84 + insets.bottom }]}
        onPress={startSpeech}
      >
        <Text style={styles.micIcon}>🎙</Text>
        <Text style={styles.micLabel}>음성 일정</Text>
      </Pressable>
      <BottomNav active="schedule" />
      <SpeechPanel
        visible={showSpeech}
        {...speech}
        title="음성 일정"
        saveLabel="일정 내용 확인"
        onStart={speech.start}
        onCancel={() => {
          speech.cancel();
          setShowSpeech(false);
        }}
        onSave={(text) => {
          speech.cancel();
          setShowSpeech(false);
          router.push({ pathname: "/voice-confirm", params: { text } });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#F8F8FB" },
  content: { paddingHorizontal: 18, gap: 16 },
  heading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headingActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontSize: 32, fontWeight: "900", color: "#171B27" },
  viewToggle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#F1ECFF",
    alignItems: "center",
    justifyContent: "center",
  },
  viewToggleText: {
    fontSize: 27,
    lineHeight: 31,
    fontWeight: "800",
    color: "#6034D9",
    includeFontPadding: false,
    textAlign: "center",
    transform: [{ translateY: 1 }],
  },
  today: {
    paddingHorizontal: 17,
    paddingVertical: 9,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#D9CCFF",
    backgroundColor: "#FAF8FF",
  },
  todayText: { color: "#6034D9", fontWeight: "800" },
  progress: {
    backgroundColor: "#FFF",
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ECECF2",
  },
  progressTitle: { fontSize: 18, fontWeight: "800", color: "#202330" },
  track: {
    height: 8,
    borderRadius: 8,
    backgroundColor: "#ECECF2",
    marginTop: 14,
    overflow: "hidden",
  },
  fill: { height: 8, backgroundColor: "#8057E9" },
  viewWindow: {
    overflow: "hidden",
    backgroundColor: "#FFF",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#ECECF2",
  },
  calendar: {
    padding: 6,
    overflow: "hidden",
  },
  week: {
    padding: 16,
  },
  weekHeader: { flexDirection: "row", justifyContent: "space-between" },
  weekDay: {
    width: 38,
    paddingVertical: 9,
    borderRadius: 20,
    alignItems: "center",
    gap: 5,
  },
  weekDayActive: { backgroundColor: "#7047E8" },
  weekday: { fontSize: 13, fontWeight: "700", color: "#515767" },
  weekNumber: { fontSize: 18, fontWeight: "800", color: "#171B27" },
  taskDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: "#7047E8" },
  hiddenDot: { opacity: 0 },
  white: { color: "#FFF" },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: { fontSize: 22, fontWeight: "900", color: "#171B27" },
  plusSmall: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: "#F1ECFF",
    alignItems: "center",
    justifyContent: "center",
  },
  plusText: { fontSize: 30, color: "#6131D9" },
  empty: {
    alignItems: "center",
    padding: 26,
    backgroundColor: "#FFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#ECECF2",
  },
  emptyIcon: { fontSize: 34 },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "800",
    marginTop: 8,
    color: "#252936",
  },
  emptyText: { fontSize: 13, color: "#7A8293", marginTop: 5 },
  mic: {
    position: "absolute",
    right: 20,
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: "#7545E8",
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
  },
  micIcon: { fontSize: 28 },
  micLabel: { fontSize: 11, color: "#FFF", fontWeight: "800" },
});
