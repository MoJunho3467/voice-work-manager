import { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

export type AppDialogButton = {
  text: string;
  style?: "default" | "cancel" | "destructive";
  onPress?: () => void | Promise<void>;
};

type DialogRequest = {
  title: string;
  message?: string;
  buttons: AppDialogButton[];
};
type ShowDialog = (request: DialogRequest) => void;

let showDialog: ShowDialog | null = null;

export function appAlert(
  title: string,
  message?: string,
  buttons?: AppDialogButton[],
) {
  showDialog?.({
    title,
    message,
    buttons: buttons?.length ? buttons : [{ text: "확인" }],
  });
}

export function AppDialogHost() {
  const [dialog, setDialog] = useState<DialogRequest | null>(null);

  useEffect(() => {
    showDialog = setDialog;
    return () => {
      showDialog = null;
    };
  }, []);

  const close = () => setDialog(null);
  const cancel =
    dialog?.buttons.find((button) => button.style === "cancel") ??
    dialog?.buttons.find((button) => button.text === "취소");
  const press = async (button: AppDialogButton) => {
    close();
    await button.onPress?.();
  };

  return (
    <Modal
      visible={!!dialog}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => {
        close();
        cancel?.onPress?.();
      }}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.icon}>
            <Text style={styles.iconText}>!</Text>
          </View>
          <Text style={styles.title}>{dialog?.title}</Text>
          {!!dialog?.message && (
            <Text style={styles.message}>{dialog.message}</Text>
          )}
          <View
            style={[
              styles.actions,
              (dialog?.buttons.length ?? 0) >= 3 && styles.actionsVertical,
            ]}
          >
            {dialog?.buttons.map((button, index) => (
              <Pressable
                key={`${button.text}-${index}`}
                onPress={() => press(button)}
                style={({ pressed }) => [
                  styles.button,
                  (dialog?.buttons.length ?? 0) >= 3 && styles.verticalButton,
                  button.style === "cancel" && styles.cancelButton,
                  button.style === "destructive" && styles.dangerButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text
                  style={[
                    styles.buttonText,
                    button.style === "cancel" && styles.cancelText,
                    button.style === "destructive" && styles.dangerText,
                  ]}
                >
                  {button.text}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(20,18,30,.48)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#FFF",
    borderRadius: 26,
    padding: 22,
    gap: 13,
    elevation: 14,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
  icon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#F0EAFF",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  iconText: { fontSize: 24, fontWeight: "900", color: "#7047E8" },
  title: {
    fontSize: 22,
    fontWeight: "900",
    color: "#202330",
    textAlign: "center",
  },
  message: {
    fontSize: 16,
    lineHeight: 24,
    color: "#626A7A",
    textAlign: "center",
  },
  actions: { flexDirection: "row", gap: 10, marginTop: 7 },
  actionsVertical: { flexDirection: "column" },
  button: {
    flex: 1,
    minHeight: 50,
    borderRadius: 15,
    backgroundColor: "#7047E8",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 15,
  },
  verticalButton: { flex: 0, width: "100%" },
  cancelButton: { backgroundColor: "#F1EDFA" },
  dangerButton: {
    backgroundColor: "#FFF0F2",
    borderWidth: 1,
    borderColor: "#F3C4CB",
  },
  buttonText: { color: "#FFF", fontSize: 16, fontWeight: "900" },
  cancelText: { color: "#5F6674" },
  dangerText: { color: "#C23B4A" },
  pressed: { opacity: 0.72 },
});
