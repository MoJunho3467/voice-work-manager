import { useEffect, useRef, useState } from "react";
import { Animated, PanResponder, StyleSheet, View } from "react-native";
import { Calendar, DateData } from "react-native-calendars";

type CollapsibleCalendarProps = {
  selected: string;
  expanded: boolean;
  markedDates: Record<string, any>;
  onDayPress: (day: DateData) => void;
  onExpandedChange: (expanded: boolean) => void;
  theme?: Record<string, any>;
};

const HEADER_HEIGHT = 92;
const DAY_ROW_HEIGHT = 48;
const COLLAPSED_HEIGHT = HEADER_HEIGHT + DAY_ROW_HEIGHT;

export function CollapsibleCalendar({
  selected,
  expanded,
  markedDates,
  onDayPress,
  onExpandedChange,
  theme,
}: CollapsibleCalendarProps) {
  const [calendarHeight, setCalendarHeight] = useState(356);
  const progress = useRef(new Animated.Value(expanded ? 1 : 0)).current;
  const expandedRef = useRef(expanded);
  expandedRef.current = expanded;
  const rowIndex = getMonthRowIndex(selected);
  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-(HEADER_HEIGHT + rowIndex * DAY_ROW_HEIGHT), 0],
  });

  const animateTo = (value: number) => {
    Animated.spring(progress, {
      toValue: value,
      damping: 18,
      stiffness: 180,
      mass: 0.8,
      useNativeDriver: false,
    }).start();
  };
  useEffect(() => {
    animateTo(expanded ? 1 : 0);
  }, [expanded]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_, gesture) =>
        Math.abs(gesture.dy) > 8 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dy) > 8 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (_, gesture) => {
        const range = Math.max(calendarHeight - COLLAPSED_HEIGHT, 1);
        const start = expandedRef.current ? range : 0;
        progress.setValue(
          Math.max(0, Math.min(1, (start + gesture.dy) / range)),
        );
      },
      onPanResponderRelease: (_, gesture) => {
        const next = expandedRef.current
          ? !(gesture.dy < -48 || gesture.vy < -0.5)
          : gesture.dy > 48 || gesture.vy > 0.5;
        onExpandedChange(next);
        animateTo(next ? 1 : 0);
      },
    }),
  ).current;

  return (
    <Animated.View
      style={[
        styles.window,
        {
          height: progress.interpolate({
            inputRange: [0, 1],
            outputRange: [COLLAPSED_HEIGHT, calendarHeight],
          }),
        },
      ]}
      {...panResponder.panHandlers}
    >
      <Animated.View
        style={[styles.calendar, { transform: [{ translateY }] }]}
        onLayout={(event) => setCalendarHeight(event.nativeEvent.layout.height)}
      >
        <Calendar
          current={selected}
          markedDates={markedDates}
          onDayPress={onDayPress}
          enableSwipeMonths
          theme={theme}
        />
      </Animated.View>
    </Animated.View>
  );
}

function getMonthRowIndex(dateKey: string) {
  const year = Number(dateKey.slice(0, 4));
  const month = Number(dateKey.slice(5, 7));
  const day = Number(dateKey.slice(8, 10));
  const firstDay = new Date(year, month - 1, 1).getDay();
  return Math.floor((firstDay + day - 1) / 7);
}

const styles = StyleSheet.create({
  window: {
    overflow: "hidden",
    backgroundColor: "#FFF",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#ECECF2",
  },
  calendar: { padding: 6 },
});
