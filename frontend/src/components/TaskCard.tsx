import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Task } from "../types";
import { timeText } from "../utils/date";
import { colors } from "./UI";
export function TaskCard({
  task,
  onPress,
  onComplete,
}: {
  task: Task;
  onPress: () => void;
  onComplete?: () => void;
}) {
  const done = task.status === "COMPLETED";
  return (
    <Pressable
      onPress={onPress}
      style={[st.card, done && { opacity: 0.5 }]}
      accessibilityLabel={`${task.title}, ${timeText(task.scheduledAt)}`}
    >
      <View style={st.dot} />
      <View style={{ flex: 1 }}>
        <Text style={[st.time, done && st.strike]}>
          {timeText(task.scheduledAt)}
        </Text>
        <Text numberOfLines={2} style={[st.title, done && st.strike]}>
          {task.title}
        </Text>
      </View>
      {onComplete && (
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: done }}
          accessibilityLabel={`${task.title} 완료 처리`}
          onPress={(e) => {
            e.stopPropagation();
            onComplete();
          }}
          style={[st.check, done && st.checked]}
        >
          <Text style={{ color: "white", fontWeight: "900" }}>
            {done ? "✓" : ""}
          </Text>
        </Pressable>
      )}
    </Pressable>
  );
}
const st = StyleSheet.create({
  card: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    backgroundColor: "white",
    padding: 15,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#DCE2EA",
  },
  dot: {
    width: 6,
    height: 52,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  time: { fontSize: 14, color: colors.primary, fontWeight: "700" },
  title: { fontSize: 17, color: colors.text, fontWeight: "700", marginTop: 2 },
  check: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: "#9AA5B4",
    alignItems: "center",
    justifyContent: "center",
  },
  checked: { backgroundColor: "#16A34A", borderColor: "#16A34A" },
  strike: { textDecorationLine: "line-through" },
});
