import { Stack, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as Notifications from "expo-notifications";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TaskProvider } from "@/context/TaskContext";
import { handleNotificationAction } from "@/services/notifications";
import { AppDialogHost } from "@/components/AppDialog";

const tabOptions = ({ route }: any) => ({
  headerShown: false,
  animation: "slide_from_right" as const,
  animationTypeForReplace:
    route.params?.navDirection === "back"
      ? ("pop" as const)
      : ("push" as const),
});

export default function RootLayout() {
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(
      async (r) => {
        await handleNotificationAction(r);
        const id = r.notification.request.content.data?.taskId;
        if (typeof id === "string") router.push(`/task/${id}`);
      },
    );
    return () => sub.remove();
  }, []);

  return (
    <SafeAreaProvider>
      <TaskProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerTintColor: "#7047E8",
            contentStyle: { backgroundColor: "#F8F8FB" },
          }}
        >
          <Stack.Screen name="index" options={tabOptions} />
          <Stack.Screen name="memos" options={tabOptions} />
          <Stack.Screen
            name="speech-dictionary"
            options={{ title: "음성 단어 사전", headerShown: true }}
          />
          <Stack.Screen name="calendar" options={{ headerShown: false }} />
          <Stack.Screen name="task/edit" options={{ headerShown: false }} />
          <Stack.Screen name="task/[id]" options={{ title: "일정 상세" }} />
          <Stack.Screen
            name="voice-confirm"
            options={{ title: "음성 일정 확인", presentation: "modal" }}
          />
          <Stack.Screen name="settings" options={tabOptions} />
        </Stack>
        <AppDialogHost />
      </TaskProvider>
    </SafeAreaProvider>
  );
}
