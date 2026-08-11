export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
export type MemoInputType = 'TEXT' | 'VOICE';
export type Task = { id: string; title: string; description: string; scheduledAt: string; status: TaskStatus; category: string; reminderMinutes: number | null; notificationId: string | null; createdAt: string; updatedAt: string };
export type TaskMemo = { id: string; taskId: string; content: string; inputType: MemoInputType; createdAt: string };
export type TaskDraft = Omit<Task, 'id'|'notificationId'|'createdAt'|'updatedAt'>;
export type ParsedSchedule = { original: string; title: string; date: string | null; hour: number | null; minute: number | null; ambiguousMeridiem: boolean; missing: ('date'|'time'|'title')[] };
