import { StyleSheet, View } from "react-native";

type ChevronIconProps = {
  direction: "up" | "down";
};

export function ChevronIcon({ direction }: ChevronIconProps) {
  const isUp = direction === "up";
  return (
    <View style={styles.icon}>
      <View style={[styles.stroke, isUp ? styles.downLeft : styles.upLeft]} />
      <View style={[styles.stroke, isUp ? styles.downRight : styles.upRight]} />
    </View>
  );
}

const styles = StyleSheet.create({
  icon: {
    width: 20,
    height: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  stroke: {
    position: "absolute",
    width: 3,
    height: 12,
    borderRadius: 2,
    backgroundColor: "#6034D9",
  },
  upLeft: { transform: [{ rotate: "-45deg" }, { translateX: -4 }] },
  upRight: { transform: [{ rotate: "45deg" }, { translateX: 4 }] },
  downLeft: { transform: [{ rotate: "45deg" }, { translateX: -4 }] },
  downRight: { transform: [{ rotate: "-45deg" }, { translateX: 4 }] },
});
