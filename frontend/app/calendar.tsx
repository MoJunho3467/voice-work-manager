import { useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { Calendar, LocaleConfig } from "react-native-calendars";
import { router } from "expo-router";
import { useTasks } from "@/context/TaskContext";
import { localDateKey, taskDateKey } from "@/utils/date";
import { TaskCard } from "@/components/TaskCard";
import { Button, s } from "@/components/UI";
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
export default function CalendarScreen() {
  const { tasks } = useTasks();
  const [selected, setSelected] = useState(localDateKey());
  const marked = useMemo(() => {
    const m: any = {};
    for (const t of tasks)
      m[taskDateKey(t.scheduledAt)] = { marked: true, dotColor: "#7047E8" };
    m[selected] = {
      ...(m[selected] ?? {}),
      selected: true,
      selectedColor: "#7047E8",
    };
    return m;
  }, [tasks, selected]);
  const dayTasks = tasks.filter((t) => taskDateKey(t.scheduledAt) === selected);
  return (
    <ScrollView style={s.screen} contentContainerStyle={s.content}>
      <View style={s.card}>
        <Calendar
          markedDates={marked}
          onDayPress={(d) => setSelected(d.dateString)}
          enableSwipeMonths
          theme={{
            todayTextColor: "#7047E8",
            arrowColor: "#7047E8",
            textDayFontSize: 16,
            textMonthFontSize: 19,
          }}
        />
      </View>
      <Text style={s.h2}>{selected} 일정</Text>
      {dayTasks.length ? (
        dayTasks.map((t) => (
          <TaskCard
            key={t.id}
            task={t}
            onPress={() => router.push(`/task/${t.id}`)}
          />
        ))
      ) : (
        <Text style={[s.muted, s.card]}>선택한 날짜에 일정이 없습니다.</Text>
      )}
      <Button
        title="선택한 날짜에 일정 추가"
        onPress={() =>
          router.push({ pathname: "/task/edit", params: { date: selected } })
        }
      />
    </ScrollView>
  );
}
