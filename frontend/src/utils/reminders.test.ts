import { describe, expect, it } from "vitest";
import {
  expandReminderRules,
  materializeReminders,
  reminderDate,
} from "./reminders";
describe("알림 시각 계산", () => {
  it("반복 규칙을 오프셋으로 확장한다", () => {
    expect(
      expandReminderRules("normal", {
        startOffsetMinutes: 30,
        intervalMinutes: 10,
        repeatCount: 3,
        untilCompleted: false,
        includeDueTime: false,
      }).map((x) => x.offsetMinutes),
    ).toEqual([30, 20, 10]);
  });
  it("일정에서 오프셋만큼 뺀다", () => {
    expect(reminderDate("2026-08-13T17:00:00", 30).getHours()).toBe(16);
    expect(reminderDate("2026-08-13T17:00:00", 30).getMinutes()).toBe(30);
  });
  it("오후 6시 일정의 실제 알림 세 시각을 만든다", () => {
    const rules = materializeReminders("2026-08-13T18:00:00+09:00", [
      { offsetMinutes: 30, mode: "normal" },
      { offsetMinutes: 20, mode: "normal" },
      { offsetMinutes: 10, mode: "normal" },
    ]);
    expect(rules.map((r) => new Date(r.scheduledAt).toISOString())).toEqual([
      "2026-08-13T08:30:00.000Z",
      "2026-08-13T08:40:00.000Z",
      "2026-08-13T08:50:00.000Z",
    ]);
  });
});
