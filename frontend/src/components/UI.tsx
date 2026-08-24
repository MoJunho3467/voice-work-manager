import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
} from "react-native";
export const colors = {
  primary: "#7047E8",
  primaryDark: "#5331C7",
  primarySoft: "#F2EDFF",
  bg: "#FAF9FE",
  card: "#FFFFFF",
  text: "#171B27",
  muted: "#747C8D",
  danger: "#DC3B5D",
  border: "#E8E3F2",
};
export function Button({
  title,
  onPress,
  variant = "primary",
  disabled = false,
  accessibilityLabel,
}: {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        variant === "secondary" && s.secondary,
        variant === "danger" && s.danger,
        (pressed || disabled) && { opacity: 0.65 },
      ]}
    >
      <Text
        style={[
          s.buttonText,
          variant === "secondary" && { color: colors.primary },
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}
export function ScreenLoading() {
  return (
    <View style={s.center}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={s.muted}>불러오는 중...</Text>
    </View>
  );
}
export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={s.label}>{label}</Text>
      {children}
    </View>
  );
}
export function Choice<T extends string>({
  label,
  items,
  value,
  onChange,
}: {
  label: string;
  items: readonly { label: string; value: T }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <Field label={label}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {items.map((item) => (
          <Pressable
            key={item.value}
            onPress={() => onChange(item.value)}
            style={{
              paddingVertical: 11,
              paddingHorizontal: 14,
              borderRadius: 18,
              backgroundColor:
                value === item.value ? colors.primary : colors.primarySoft,
              borderWidth: 1,
              borderColor: value === item.value ? colors.primary : "#D8CAFA",
            }}
          >
            <Text
              style={{
                color: value === item.value ? "white" : colors.primaryDark,
                fontWeight: "800",
              }}
            >
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </Field>
  );
}
export const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 18, gap: 14 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 17,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: { fontSize: 28, fontWeight: "900", color: colors.text },
  h2: { fontSize: 20, fontWeight: "800", color: colors.text },
  body: { fontSize: 16, color: colors.text },
  muted: { fontSize: 14, color: colors.muted },
  button: {
    minHeight: 54,
    borderRadius: 15,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  buttonText: { fontSize: 16, fontWeight: "800", color: "white" },
  secondary: {
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: "#CDBEFF",
  },
  danger: { backgroundColor: colors.danger },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 30,
  },
  input: {
    minHeight: 54,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    backgroundColor: "white",
    paddingHorizontal: 15,
    fontSize: 16,
    color: colors.text,
  },
  label: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 6,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  choice: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#DED4FA",
  },
  choiceActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  choiceText: { color: colors.primaryDark, fontWeight: "800" },
  choiceTextActive: { color: "white", fontWeight: "800" },
});
