import type {
  NotificationMode,
  ParsedReminder,
  ReminderDraft,
  ReminderRepeat,
} from "../types";
export const MAX_REMINDERS = 12;
export function withDueReminder(
  rules: ParsedReminder[],
  mode: NotificationMode,
): ParsedReminder[] {
  const withoutDue = uniqueReminderDrafts(
    rules.filter((rule) => rule.offsetMinutes !== 0),
  ).slice(0, MAX_REMINDERS - 1);
  return [...withoutDue, { offsetMinutes: 0, mode }].sort(
    (a, b) => b.offsetMinutes - a.offsetMinutes,
  );
}
export function expandReminderRules(
  mode: NotificationMode,
  repeat: ReminderRepeat,
): ParsedReminder[] {
  const rules: ParsedReminder[] = [];
  const count = repeat.untilCompleted
    ? MAX_REMINDERS
    : Math.min(repeat.repeatCount ?? MAX_REMINDERS, MAX_REMINDERS);
  for (let i = 0; i < count; i += 1) {
    const offset = repeat.startOffsetMinutes - repeat.intervalMinutes * i;
    if (offset < 0 && !repeat.untilCompleted) break;
    rules.push({ offsetMinutes: offset, mode });
  }
  if (repeat.includeDueTime && !rules.some((r) => r.offsetMinutes === 0))
    rules.push({ offsetMinutes: 0, mode });
  return rules
    .slice(0, MAX_REMINDERS)
    .sort((a, b) => b.offsetMinutes - a.offsetMinutes);
}
export const reminderDate = (scheduledAt: string, offsetMinutes: number) =>
  new Date(new Date(scheduledAt).getTime() - offsetMinutes * 60000);
export const materializeReminders = (
  scheduledAt: string,
  rules: ParsedReminder[],
): ReminderDraft[] =>
  rules.map((r) => ({
    scheduledAt: reminderDate(scheduledAt, r.offsetMinutes).toISOString(),
    mode: r.mode,
    offsetMinutes: r.offsetMinutes,
  }));
export function uniqueReminderDrafts(rules: ParsedReminder[]) {
  const seen = new Set<string>();
  return rules
    .filter((r) => {
      const key = `${r.offsetMinutes}:${r.mode}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, MAX_REMINDERS);
}
