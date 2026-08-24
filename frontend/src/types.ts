export type TaskStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED";
export type MemoInputType = "TEXT" | "VOICE";
export type NotificationMode = "normal" | "voice" | "alarm";
export type ReminderRule = {
  id: string;
  taskId: string;
  scheduledAt: string;
  offsetMinutes: number | null;
  mode: NotificationMode;
  notificationId: string | null;
};
export type ReminderDraft = {
  scheduledAt: string;
  mode: NotificationMode;
  offsetMinutes?: number | null;
};
export type ParsedReminder = { offsetMinutes: number; mode: NotificationMode };
export type ReminderRepeat = {
  startOffsetMinutes: number;
  intervalMinutes: number;
  repeatCount: number | null;
  untilCompleted: boolean;
  includeDueTime: boolean;
};
export type Task = {
  id: string;
  title: string;
  description: string;
  scheduledAt: string;
  status: TaskStatus;
  category: string;
  reminderMinutes: number | null;
  notificationId: string | null;
  reminders: ReminderRule[];
  repeat: ReminderRepeat | null;
  createdAt: string;
  updatedAt: string;
};
export type TaskMemo = {
  id: string;
  taskId: string;
  content: string;
  inputType: MemoInputType;
  createdAt: string;
};
export type MemoImage = {
  id: string;
  memoId: string;
  fileName: string;
  relativePath: string;
  createdAt: string;
};
export type DailyMemo = {
  id: string;
  memoDate: string;
  content: string;
  pinned: boolean;
  images: MemoImage[];
  createdAt: string;
  updatedAt: string;
};
export type TaskDraft = Omit<
  Task,
  "id" | "notificationId" | "createdAt" | "updatedAt" | "reminders"
> & { reminders: ReminderDraft[] };
export type ParsedSchedule = {
  original: string;
  title: string;
  date: string | null;
  hour: number | null;
  minute: number | null;
  ambiguousMeridiem: boolean;
  missing: ("date" | "time" | "title")[];
  reminders: ParsedReminder[];
  repeat: ReminderRepeat | null;
  notificationMode: NotificationMode;
  notificationsDisabled: boolean;
  hasExplicitReminder: boolean;
  warnings: string[];
};
export type AppSettings = {
  defaultMode: NotificationMode;
  defaultOffsetMinutes: number;
  defaultRepeatInterval: number | null;
  defaultRepeatCount: number;
};
export type SpeechTerm = {
  id: string;
  term: string;
  createdAt: string;
};
export type SpeechCorrection = {
  id: string;
  wrongText: string;
  correctText: string;
  createdAt: string;
};
