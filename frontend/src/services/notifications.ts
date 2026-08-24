import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import AndroidAlarm from "../../modules/android-alarm";
import type { NotificationMode, Task } from "../types";
import { getTask, setReminderNotificationId, updateTask } from "./database";

export const COMPLETE_ACTION = "COMPLETE_TASK";
export const SNOOZE_ACTION = "SNOOZE_10";
export type ScheduleResult = {
  scheduled: number;
  skipped: number;
  permissionDenied: boolean;
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function configureNotifications() {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("task-normal", {
      name: "일반 업무 알림",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      sound: "task_notification.wav",
    });
  }
  await Notifications.setNotificationCategoryAsync("TASK_ACTIONS", [
    {
      identifier: COMPLETE_ACTION,
      buttonTitle: "완료",
      options: { opensAppToForeground: false },
    },
    {
      identifier: SNOOZE_ACTION,
      buttonTitle: "10분 미루기",
      options: { opensAppToForeground: false },
    },
  ]);
}

async function ensurePermission() {
  const current = await Notifications.getPermissionsAsync();
  if (current.status === "granted") return true;
  if (current.status === "undetermined")
    return (await Notifications.requestPermissionsAsync()).status === "granted";
  return false;
}

function requestCodeFor(ruleId: string) {
  let hash = 0;
  for (let index = 0; index < ruleId.length; index += 1) {
    hash = (Math.imul(31, hash) + ruleId.charCodeAt(index)) | 0;
  }
  return hash & 0x7fffffff;
}

function reminderMessage(task: Task, reminderAt: Date) {
  const minutes = Math.max(
    0,
    Math.round(
      (new Date(task.scheduledAt).getTime() - reminderAt.getTime()) / 60_000,
    ),
  );
  return minutes === 0
    ? `${task.title} 할 시간입니다.`
    : `${task.title} 일정 ${minutes}분 전입니다.`;
}

async function cancelNotificationId(notificationId: string) {
  if (Platform.OS === "android" && notificationId.startsWith("native:")) {
    const requestCode = Number(notificationId.slice("native:".length));
    if (Number.isInteger(requestCode)) await AndroidAlarm.cancel(requestCode);
    return;
  }
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}

export async function cancelTaskNotifications(task: Pick<Task, "reminders">) {
  for (const rule of task.reminders) {
    if (!rule.notificationId) continue;
    try {
      await cancelNotificationId(rule.notificationId);
    } catch {
      console.warn("예약 알림 취소 실패", rule.id);
    }
    await setReminderNotificationId(rule.id, null);
  }
}

export async function scheduleTaskNotifications(
  task: Task,
): Promise<ScheduleResult> {
  await cancelTaskNotifications(task);
  if (task.status === "COMPLETED" || task.reminders.length === 0) {
    return {
      scheduled: 0,
      skipped: task.reminders.length,
      permissionDenied: false,
    };
  }
  if (!(await ensurePermission())) {
    return {
      scheduled: 0,
      skipped: task.reminders.length,
      permissionDenied: true,
    };
  }

  let scheduled = 0;
  let skipped = 0;
  for (const rule of task.reminders) {
    const at = new Date(rule.scheduledAt);
    if (at.getTime() <= Date.now()) {
      skipped += 1;
      continue;
    }

    const body = reminderMessage(task, at);
    let id: string;
    if (
      Platform.OS === "android" &&
      (rule.mode === "voice" || rule.mode === "alarm")
    ) {
      id = await AndroidAlarm.schedule(
        requestCodeFor(rule.id),
        at.getTime(),
        task.title,
        body,
        rule.mode,
      );
    } else {
      id = await Notifications.scheduleNotificationAsync({
        content: {
          title: task.title,
          body,
          sound: "task_notification.wav",
          categoryIdentifier: "TASK_ACTIONS",
          priority: Notifications.AndroidNotificationPriority.HIGH,
          data: { taskId: task.id, ruleId: rule.id, mode: rule.mode },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: at,
          channelId: "task-normal",
        },
      });
    }
    await setReminderNotificationId(rule.id, id);
    scheduled += 1;
  }
  return { scheduled, skipped, permissionDenied: false };
}

export async function getAndroidAlarmPermissions() {
  if (Platform.OS !== "android") return { exact: true, fullScreen: true };
  return {
    exact: await AndroidAlarm.canScheduleExactAlarms(),
    fullScreen: await AndroidAlarm.canUseFullScreenIntent(),
  };
}

export async function openExactAlarmSettings() {
  if (Platform.OS === "android") await AndroidAlarm.openExactAlarmSettings();
}

export async function openFullScreenAlarmSettings() {
  if (Platform.OS === "android")
    await AndroidAlarm.openFullScreenIntentSettings();
}

export async function handleNotificationAction(
  response: Notifications.NotificationResponse,
) {
  const taskId = response.notification.request.content.data?.taskId;
  if (typeof taskId !== "string") return null;
  const task = await getTask(taskId);
  if (!task) return null;

  if (response.actionIdentifier === COMPLETE_ACTION) {
    await cancelTaskNotifications(task);
    await updateTask(task.id, {
      title: task.title,
      description: task.description,
      scheduledAt: task.scheduledAt,
      status: "COMPLETED",
      category: task.category,
      reminderMinutes: task.reminderMinutes,
      reminders: task.reminders.map((rule) => ({
        scheduledAt: rule.scheduledAt,
        offsetMinutes: rule.offsetMinutes,
        mode: rule.mode,
      })),
      repeat: task.repeat,
    });
    return "completed" as const;
  }

  if (response.actionIdentifier === SNOOZE_ACTION) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: task.title,
        body: "10분 미룬 업무입니다.",
        sound: "task_notification.wav",
        categoryIdentifier: "TASK_ACTIONS",
        data: { taskId: task.id, mode: "normal" satisfies NotificationMode },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 600,
        channelId: "task-normal",
      },
    });
    return "snoozed" as const;
  }
  return null;
}

export async function restorePendingNotifications() {
  const listTasks = (await import("./database")).listTasks;
  for (const task of await listTasks()) {
    if (task.status !== "COMPLETED") await scheduleTaskNotifications(task);
  }
}
