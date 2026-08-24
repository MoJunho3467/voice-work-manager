import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type NavKey = "schedule" | "memos" | "settings";

export function BottomNav({ active }: { active: NavKey }) {
  const insets = useSafeAreaInsets();
  const items = [
    { key: "schedule" as const, label: "일정", icon: "▦", path: "/" as const },
    {
      key: "memos" as const,
      label: "메모",
      icon: "▤",
      path: "/memos" as const,
    },
    {
      key: "settings" as const,
      label: "설정",
      icon: "⚙",
      path: "/settings" as const,
    },
  ];
  const activeIndex = items.findIndex((item) => item.key === active);

  const moveTo = (key: NavKey, path: "/" | "/memos" | "/settings") => {
    if (key === active) return;
    const targetIndex = items.findIndex((item) => item.key === key);
    router.replace({
      pathname: path,
      params: { navDirection: targetIndex < activeIndex ? "back" : "forward" },
    });
  };

  return (
    <View
      style={[
        styles.nav,
        { height: 68 + insets.bottom, paddingBottom: insets.bottom },
      ]}
    >
      {items.map((item) => (
        <Pressable
          key={item.key}
          onPress={() => moveTo(item.key, item.path)}
          style={styles.item}
        >
          <Text style={[styles.icon, active === item.key && styles.active]}>
            {item.icon}
          </Text>
          <Text style={[styles.label, active === item.key && styles.active]}>
            {item.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  nav: {
    backgroundColor: "#FFF",
    borderTopWidth: 1,
    borderTopColor: "#E8EAF0",
    flexDirection: "row",
  },
  item: { flex: 1, alignItems: "center", justifyContent: "center", gap: 3 },
  icon: { fontSize: 24, color: "#8B93A4" },
  label: { fontSize: 13, fontWeight: "700", color: "#8B93A4" },
  active: { color: "#7047E8" },
});
