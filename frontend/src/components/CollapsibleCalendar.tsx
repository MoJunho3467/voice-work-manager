import { useEffect, useMemo, useRef } from "react";
import { Animated, PanResponder, Pressable, StyleSheet, Text, View } from "react-native";
import type { DateData } from "react-native-calendars";

type Props = {
  selected: string;
  expanded: boolean;
  markedDates: Record<string, any>;
  onDayPress: (day: DateData) => void;
  onExpandedChange: (expanded: boolean) => void;
  onGestureActiveChange?: (active: boolean) => void;
  onTodayPress?: () => void;
  theme?: Record<string, any>;
};

const PURPLE = "#7047E8";
const HEADER_HEIGHT = 58;
const WEEKDAY_HEIGHT = 25;
const DAY_ROW_HEIGHT = 42;
const FOOTER_HEIGHT = 49;
const MONTH_ROWS = 6;
const COLLAPSED_HEIGHT = HEADER_HEIGHT + WEEKDAY_HEIGHT + DAY_ROW_HEIGHT + FOOTER_HEIGHT + 15;
const EXPANDED_HEIGHT = HEADER_HEIGHT + WEEKDAY_HEIGHT + DAY_ROW_HEIGHT * MONTH_ROWS + FOOTER_HEIGHT;
const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export function CollapsibleCalendar({ selected, expanded, markedDates, onDayPress, onExpandedChange, onGestureActiveChange, onTodayPress }: Props) {
  const progress = useRef(new Animated.Value(expanded ? 1 : 0)).current;
  const expandedRef = useRef(expanded);
  expandedRef.current = expanded;
  const selectedDate = useMemo(() => parseDateKey(selected), [selected]);
  const monthDays = useMemo(() => getMonthGrid(selectedDate), [selectedDate]);
  const weekDays = useMemo(() => getWeek(selectedDate), [selectedDate]);

  const animateTo = (next: boolean) => Animated.spring(progress, {
    toValue: next ? 1 : 0,
    damping: 20,
    stiffness: 210,
    mass: 0.8,
    useNativeDriver: false,
  }).start();

  useEffect(() => animateTo(expanded), [expanded]);

  const changeMonth = (amount: number) => {
    const targetMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + amount, 1);
    const lastDay = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0).getDate();
    targetMonth.setDate(Math.min(selectedDate.getDate(), lastDay));
    onDayPress(toDateData(targetMonth));
  };

  const panResponder = useRef(PanResponder.create({
    onMoveShouldSetPanResponderCapture: (_, gesture) =>
      Math.abs(gesture.dy) > 2 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
    onMoveShouldSetPanResponder: (_, gesture) =>
      Math.abs(gesture.dy) > 2 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
    onPanResponderGrant: () => onGestureActiveChange?.(true),
    onPanResponderTerminationRequest: () => false,
    onPanResponderMove: (_, gesture) => {
      const range = EXPANDED_HEIGHT - COLLAPSED_HEIGHT;
      const start = expandedRef.current ? 1 : 0;
      progress.setValue(Math.max(0, Math.min(1, start + gesture.dy / range)));
    },
    onPanResponderRelease: (_, gesture) => {
      onGestureActiveChange?.(false);
      const next = expandedRef.current
        ? !(gesture.dy < -10 || gesture.vy < -0.12)
        : gesture.dy > 10 || gesture.vy > 0.12;
      onExpandedChange(next);
      animateTo(next);
    },
    onPanResponderTerminate: () => {
      onGestureActiveChange?.(false);
      animateTo(expandedRef.current);
    },
    onShouldBlockNativeResponder: () => true,
  })).current;

  return (
    <View
      style={styles.gestureArea}
      onTouchStart={() => onGestureActiveChange?.(true)}
      onTouchEnd={() => onGestureActiveChange?.(false)}
      onTouchCancel={() => onGestureActiveChange?.(false)}
      {...panResponder.panHandlers}
    >
      <Animated.View
        style={[styles.window, { height: progress.interpolate({ inputRange: [0, 1], outputRange: [COLLAPSED_HEIGHT, EXPANDED_HEIGHT] }) }]}
      >
      <View style={styles.header}>
        <Pressable style={styles.arrowButton} onPress={() => changeMonth(-1)}><Text style={styles.arrow}>‹</Text></Pressable>
        <Text style={styles.monthLabel}>{selectedDate.getFullYear()}년 {selectedDate.getMonth() + 1}월</Text>
        <Pressable style={styles.arrowButton} onPress={() => changeMonth(1)}><Text style={styles.arrow}>›</Text></Pressable>
        <Pressable style={styles.todayButton} onPress={onTodayPress}><Text style={styles.todayText}>오늘</Text></Pressable>
      </View>

      <View style={styles.weekdayRow}>
        {WEEKDAYS.map((label, index) => <Text key={label} style={[styles.weekday, index === 0 && styles.sunday, index === 6 && styles.saturday]}>{label}</Text>)}
      </View>

      <View style={styles.daysViewport}>
        <Animated.View pointerEvents={expanded ? "auto" : "none"} style={[styles.monthGrid, { opacity: progress }]}>
          {monthDays.map((date) => <DayCell key={dateKey(date)} date={date} selected={selected} currentMonth={selectedDate.getMonth()} markedDates={markedDates} onPress={onDayPress} />)}
        </Animated.View>
        <Animated.View pointerEvents={expanded ? "none" : "auto"} style={[styles.weekGrid, { opacity: Animated.subtract(1, progress) }]}>
          {weekDays.map((date) => <DayCell key={dateKey(date)} date={date} selected={selected} currentMonth={selectedDate.getMonth()} markedDates={markedDates} onPress={onDayPress} />)}
        </Animated.View>
      </View>

      <View style={styles.footer}>
        <View style={styles.handle} />
        <Text style={styles.swipeHint}>{expanded ? "위로 밀어 주간 보기" : "아래로 밀어 월간 보기"}</Text>
      </View>
      </Animated.View>
    </View>
  );
}

function DayCell({ date, selected, currentMonth, markedDates, onPress }: { date: Date; selected: string; currentMonth: number; markedDates: Record<string, any>; onPress: (day: DateData) => void }) {
  const key = dateKey(date);
  const active = key === selected;
  const muted = date.getMonth() !== currentMonth;
  const marked = Boolean(markedDates[key]?.marked);
  return (
    <Pressable style={styles.dayCell} onPress={() => onPress(toDateData(date))}>
      <View style={[styles.dayCircle, active && styles.dayCircleActive]}>
        <Text style={[styles.dayNumber, muted && styles.dayMuted, active && styles.dayActiveText]}>{date.getDate()}</Text>
      </View>
      <View style={[styles.dot, !marked && styles.dotHidden, active && styles.dotActive]} />
    </Pressable>
  );
}

function parseDateKey(value: string) { return new Date(Number(value.slice(0, 4)), Number(value.slice(5, 7)) - 1, Number(value.slice(8, 10))); }
function dateKey(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
function getWeek(selected: Date) {
  const sunday = new Date(selected);
  sunday.setDate(selected.getDate() - selected.getDay());
  return Array.from({ length: 7 }, (_, index) => { const date = new Date(sunday); date.setDate(sunday.getDate() + index); return date; });
}
function getMonthGrid(selected: Date) {
  const first = new Date(selected.getFullYear(), selected.getMonth(), 1);
  first.setDate(first.getDate() - first.getDay());
  return Array.from({ length: 42 }, (_, index) => { const date = new Date(first); date.setDate(first.getDate() + index); return date; });
}
function toDateData(date: Date): DateData { return { dateString: dateKey(date), day: date.getDate(), month: date.getMonth() + 1, year: date.getFullYear(), timestamp: date.getTime() }; }

const styles = StyleSheet.create({
  gestureArea: { width: "100%" },
  window: { overflow: "hidden", backgroundColor: "#FFF", borderRadius: 22, borderWidth: 1, borderColor: "#ECECF2" },
  header: { height: HEADER_HEIGHT, flexDirection: "row", alignItems: "center", paddingHorizontal: 11 },
  arrowButton: { width: 38, height: 38, alignItems: "center", justifyContent: "center" },
  arrow: { fontSize: 31, lineHeight: 34, color: "#252936" },
  monthLabel: { fontSize: 18, fontWeight: "900", color: "#202330", marginHorizontal: 3 },
  todayButton: { marginLeft: "auto", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14, backgroundColor: "#F2EDFF" },
  todayText: { color: "#6034D9", fontWeight: "800" },
  weekdayRow: { height: WEEKDAY_HEIGHT, flexDirection: "row", alignItems: "center", paddingHorizontal: 8 },
  weekday: { width: `${100 / 7}%`, textAlign: "center", fontSize: 12, fontWeight: "700", color: "#777D8B" },
  sunday: { color: "#CB6571" }, saturday: { color: "#5B75C9" },
  daysViewport: { height: DAY_ROW_HEIGHT * MONTH_ROWS, overflow: "hidden", paddingHorizontal: 8 },
  monthGrid: { flexDirection: "row", flexWrap: "wrap" },
  weekGrid: { position: "absolute", top: 0, left: 8, right: 8, flexDirection: "row" },
  dayCell: { width: `${100 / 7}%`, height: DAY_ROW_HEIGHT, alignItems: "center", justifyContent: "center" },
  dayCircle: { width: 31, height: 31, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  dayCircleActive: { backgroundColor: PURPLE },
  dayNumber: { fontSize: 15, fontWeight: "800", color: "#202330" },
  dayMuted: { color: "#B5B8C1" }, dayActiveText: { color: "#FFF" },
  dot: { position: "absolute", bottom: 1, width: 4, height: 4, borderRadius: 2, backgroundColor: PURPLE },
  dotHidden: { opacity: 0 }, dotActive: { backgroundColor: PURPLE },
  footer: { position: "absolute", left: 0, right: 0, bottom: 0, height: FOOTER_HEIGHT, alignItems: "center", justifyContent: "center", borderTopWidth: 1, borderTopColor: "#F0EDF6", backgroundColor: "#FFF" },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: "#D1CED9", marginBottom: 6 },
  swipeHint: { fontSize: 12, color: "#555B69", fontWeight: "700" },
});
