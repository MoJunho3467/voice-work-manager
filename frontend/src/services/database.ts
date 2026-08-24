import * as SQLite from "expo-sqlite";
import type {
  AppSettings,
  DailyMemo,
  MemoImage,
  MemoInputType,
  NotificationMode,
  ReminderDraft,
  ReminderRepeat,
  ReminderRule,
  Task,
  TaskDraft,
  TaskMemo,
  TaskStatus,
  SpeechCorrection,
  SpeechTerm,
} from "../types";
import { uuid } from "../utils/date";

type TaskRow = {
  id: string;
  title: string;
  description: string;
  scheduled_at: string;
  status: TaskStatus;
  category: string;
  reminder_minutes: number | null;
  notification_id: string | null;
  repeat_start_offset: number | null;
  repeat_interval: number | null;
  repeat_count: number | null;
  repeat_until_completed: number;
  repeat_include_due: number;
  created_at: string;
  updated_at: string;
};
type ReminderRow = {
  id: string;
  task_id: string;
  offset_minutes: number | null;
  scheduled_at: string | null;
  mode: NotificationMode;
  notification_id: string | null;
};
type SettingsRow = {
  default_mode: NotificationMode;
  default_offset_minutes: number;
  default_repeat_interval: number | null;
  default_repeat_count: number;
};
type SpeechTermRow = {
  id: string;
  term: string;
  created_at: string;
};
type SpeechCorrectionRow = {
  id: string;
  wrong_text: string;
  correct_text: string;
  created_at: string;
};
type Backup = {
  schemaVersion: number;
  tasks: Task[];
  memos: TaskMemo[];
  dailyMemos?: DailyMemo[];
  memoImages?: MemoImage[];
  settings?: AppSettings;
  speechTerms?: SpeechTerm[];
  speechCorrections?: SpeechCorrection[];
};

const dbPromise = SQLite.openDatabaseAsync("voice-work.db");
export const DEFAULT_SETTINGS: AppSettings = {
  defaultMode: "normal",
  defaultOffsetMinutes: 10,
  defaultRepeatInterval: null,
  defaultRepeatCount: 1,
};

export async function initDatabase() {
  const db = await dbPromise;
  await db.execAsync(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;
CREATE TABLE IF NOT EXISTS tasks(id TEXT PRIMARY KEY NOT NULL,title TEXT NOT NULL,description TEXT NOT NULL DEFAULT '',scheduled_at TEXT NOT NULL,status TEXT NOT NULL CHECK(status IN ('PENDING','IN_PROGRESS','COMPLETED')),category TEXT NOT NULL,reminder_minutes INTEGER,notification_id TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS task_memos(id TEXT PRIMARY KEY NOT NULL,task_id TEXT NOT NULL,content TEXT NOT NULL,input_type TEXT NOT NULL CHECK(input_type IN ('TEXT','VOICE')),created_at TEXT NOT NULL,FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE);`);
  await db.execAsync(`CREATE TABLE IF NOT EXISTS daily_memos(id TEXT PRIMARY KEY NOT NULL,memo_date TEXT NOT NULL,content TEXT NOT NULL,pinned INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL,updated_at TEXT NOT NULL);CREATE INDEX IF NOT EXISTS idx_daily_memos_date ON daily_memos(memo_date,created_at);
CREATE TABLE IF NOT EXISTS memo_images(id TEXT PRIMARY KEY NOT NULL,memo_id TEXT NOT NULL,file_name TEXT NOT NULL,relative_path TEXT NOT NULL,created_at TEXT NOT NULL,FOREIGN KEY(memo_id) REFERENCES daily_memos(id) ON DELETE CASCADE);
CREATE INDEX IF NOT EXISTS idx_memo_images_memo ON memo_images(memo_id,created_at);`);
  await db.execAsync(`CREATE TABLE IF NOT EXISTS speech_terms(id TEXT PRIMARY KEY NOT NULL,term TEXT NOT NULL UNIQUE,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS speech_corrections(id TEXT PRIMARY KEY NOT NULL,wrong_text TEXT NOT NULL UNIQUE,correct_text TEXT NOT NULL,created_at TEXT NOT NULL);`);
  const columns = await db.getAllAsync<{ name: string }>(
    "PRAGMA table_info(tasks)",
  );
  const names = new Set(columns.map((c) => c.name));
  for (const [name, sql] of [
    ["repeat_start_offset", "INTEGER"],
    ["repeat_interval", "INTEGER"],
    ["repeat_count", "INTEGER"],
    ["repeat_until_completed", "INTEGER NOT NULL DEFAULT 0"],
    ["repeat_include_due", "INTEGER NOT NULL DEFAULT 0"],
  ] as const)
    if (!names.has(name))
      await db.execAsync(`ALTER TABLE tasks ADD COLUMN ${name} ${sql}`);
  await db.execAsync(`CREATE TABLE IF NOT EXISTS reminder_rules(id TEXT PRIMARY KEY NOT NULL,task_id TEXT NOT NULL,offset_minutes INTEGER,mode TEXT NOT NULL CHECK(mode IN ('normal','voice','alarm')),notification_id TEXT,scheduled_at TEXT,FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS app_settings(id INTEGER PRIMARY KEY CHECK(id=1),default_mode TEXT NOT NULL,default_offset_minutes INTEGER NOT NULL,default_repeat_interval INTEGER,default_repeat_count INTEGER NOT NULL);
INSERT OR IGNORE INTO app_settings VALUES(1,'normal',10,NULL,1);
INSERT INTO reminder_rules(id,task_id,offset_minutes,mode,notification_id) SELECT lower(hex(randomblob(16))),id,reminder_minutes,'normal',notification_id FROM tasks WHERE reminder_minutes IS NOT NULL AND NOT EXISTS(SELECT 1 FROM reminder_rules r WHERE r.task_id=tasks.id);
CREATE INDEX IF NOT EXISTS idx_tasks_scheduled ON tasks(scheduled_at);CREATE INDEX IF NOT EXISTS idx_memos_task ON task_memos(task_id,created_at);CREATE INDEX IF NOT EXISTS idx_reminders_task ON reminder_rules(task_id);`);
  const reminderColumns = await db.getAllAsync<{ name: string }>(
    "PRAGMA table_info(reminder_rules)",
  );
  if (!reminderColumns.some((c) => c.name === "scheduled_at"))
    await db.execAsync(
      "ALTER TABLE reminder_rules ADD COLUMN scheduled_at TEXT",
    );
  const legacy = await db.getAllAsync<{
    id: string;
    task_time: string;
    offset_minutes: number;
  }>(
    "SELECT r.id,t.scheduled_at AS task_time,r.offset_minutes FROM reminder_rules r JOIN tasks t ON t.id=r.task_id WHERE r.scheduled_at IS NULL",
  );
  for (const row of legacy)
    await db.runAsync(
      "UPDATE reminder_rules SET scheduled_at=? WHERE id=?",
      new Date(
        new Date(row.task_time).getTime() - row.offset_minutes * 60000,
      ).toISOString(),
      row.id,
    );
  await db.execAsync("PRAGMA user_version=4;");
}

const mapReminder = (r: ReminderRow): ReminderRule => ({
  id: r.id,
  taskId: r.task_id,
  scheduledAt: r.scheduled_at ?? new Date(0).toISOString(),
  offsetMinutes: r.offset_minutes,
  mode: r.mode,
  notificationId: r.notification_id,
});
const mapRepeat = (r: TaskRow): ReminderRepeat | null =>
  r.repeat_start_offset === null || r.repeat_interval === null
    ? null
    : {
        startOffsetMinutes: r.repeat_start_offset,
        intervalMinutes: r.repeat_interval,
        repeatCount: r.repeat_count,
        untilCompleted: r.repeat_until_completed === 1,
        includeDueTime: r.repeat_include_due === 1,
      };
async function hydrate(rows: TaskRow[]) {
  if (rows.length === 0) return [];
  const db = await dbPromise;
  const placeholders = rows.map(() => "?").join(",");
  const reminders = (
    await db.getAllAsync<ReminderRow>(
      `SELECT * FROM reminder_rules WHERE task_id IN (${placeholders}) ORDER BY scheduled_at ASC`,
      ...rows.map((r) => r.id),
    )
  ).map(mapReminder);
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    scheduledAt: r.scheduled_at,
    status: r.status,
    category: r.category,
    reminderMinutes: r.reminder_minutes,
    notificationId: r.notification_id,
    reminders: reminders.filter((x) => x.taskId === r.id),
    repeat: mapRepeat(r),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}
export async function listTasks() {
  const db = await dbPromise;
  return hydrate(
    await db.getAllAsync<TaskRow>(
      "SELECT * FROM tasks ORDER BY scheduled_at ASC",
    ),
  );
}
export async function getTask(id: string) {
  const db = await dbPromise;
  const r = await db.getFirstAsync<TaskRow>(
    "SELECT * FROM tasks WHERE id=?",
    id,
  );
  return r ? (await hydrate([r]))[0] : null;
}
async function replaceRules(taskId: string, rules: ReminderDraft[]) {
  const db = await dbPromise;
  await db.runAsync("DELETE FROM reminder_rules WHERE task_id=?", taskId);
  for (const r of rules)
    await db.runAsync(
      "INSERT INTO reminder_rules(id,task_id,offset_minutes,mode,notification_id,scheduled_at) VALUES(?,?,?,?,NULL,?)",
      uuid(),
      taskId,
      r.offsetMinutes ?? null,
      r.mode,
      r.scheduledAt,
    );
}
export async function createTask(d: TaskDraft) {
  const db = await dbPromise;
  const id = uuid(),
    now = new Date().toISOString(),
    r = d.repeat;
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      "INSERT INTO tasks(id,title,description,scheduled_at,status,category,reminder_minutes,notification_id,repeat_start_offset,repeat_interval,repeat_count,repeat_until_completed,repeat_include_due,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
      id,
      d.title,
      d.description,
      d.scheduledAt,
      d.status,
      d.category,
      d.reminders[0]?.offsetMinutes ?? null,
      null,
      r?.startOffsetMinutes ?? null,
      r?.intervalMinutes ?? null,
      r?.repeatCount ?? null,
      r?.untilCompleted ? 1 : 0,
      r?.includeDueTime ? 1 : 0,
      now,
      now,
    );
    await replaceRules(id, d.reminders);
  });
  return (await getTask(id))!;
}
export async function updateTask(id: string, d: TaskDraft) {
  const db = await dbPromise,
    r = d.repeat;
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      "UPDATE tasks SET title=?,description=?,scheduled_at=?,status=?,category=?,reminder_minutes=?,notification_id=NULL,repeat_start_offset=?,repeat_interval=?,repeat_count=?,repeat_until_completed=?,repeat_include_due=?,updated_at=? WHERE id=?",
      d.title,
      d.description,
      d.scheduledAt,
      d.status,
      d.category,
      d.reminders[0]?.offsetMinutes ?? null,
      r?.startOffsetMinutes ?? null,
      r?.intervalMinutes ?? null,
      r?.repeatCount ?? null,
      r?.untilCompleted ? 1 : 0,
      r?.includeDueTime ? 1 : 0,
      new Date().toISOString(),
      id,
    );
    await replaceRules(id, d.reminders);
  });
  return (await getTask(id))!;
}
export async function setReminderNotificationId(
  ruleId: string,
  value: string | null,
) {
  const db = await dbPromise;
  await db.runAsync(
    "UPDATE reminder_rules SET notification_id=? WHERE id=?",
    value,
    ruleId,
  );
}
export async function deleteTaskRow(id: string) {
  const db = await dbPromise;
  await db.runAsync("DELETE FROM tasks WHERE id=?", id);
}
export async function listMemos(taskId: string) {
  const db = await dbPromise;
  return db.getAllAsync<TaskMemo>(
    "SELECT id,task_id as taskId,content,input_type as inputType,created_at as createdAt FROM task_memos WHERE task_id=? ORDER BY created_at ASC",
    taskId,
  );
}
export async function addMemo(
  taskId: string,
  content: string,
  inputType: MemoInputType,
) {
  const db = await dbPromise;
  const memo = {
    id: uuid(),
    taskId,
    content,
    inputType,
    createdAt: new Date().toISOString(),
  };
  await db.runAsync(
    "INSERT INTO task_memos VALUES(?,?,?,?,?)",
    memo.id,
    memo.taskId,
    memo.content,
    memo.inputType,
    memo.createdAt,
  );
  return memo;
}
export async function listDailyMemos(date?: string) {
  const db = await dbPromise;
  const sql = date
    ? "SELECT id,memo_date as memoDate,content,pinned,created_at as createdAt,updated_at as updatedAt FROM daily_memos WHERE memo_date=? ORDER BY pinned DESC,created_at DESC"
    : "SELECT id,memo_date as memoDate,content,pinned,created_at as createdAt,updated_at as updatedAt FROM daily_memos ORDER BY memo_date DESC,pinned DESC,created_at DESC";
  const rows = await db.getAllAsync<any>(sql, ...(date ? [date] : []));
  if (rows.length === 0) return [];
  const placeholders = rows.map(() => "?").join(",");
  const images = await db.getAllAsync<MemoImage>(
    `SELECT id,memo_id as memoId,file_name as fileName,relative_path as relativePath,created_at as createdAt FROM memo_images WHERE memo_id IN (${placeholders}) ORDER BY created_at`,
    ...rows.map((m: any) => m.id),
  );
  return rows.map(
    (m: any): DailyMemo => ({
      ...m,
      pinned: m.pinned === 1,
      images: images.filter((image) => image.memoId === m.id),
    }),
  );
}
export async function listDailyMemoDates() {
  const db = await dbPromise;
  const rows = await db.getAllAsync<{ memoDate: string }>(
    "SELECT DISTINCT memo_date as memoDate FROM daily_memos ORDER BY memo_date",
  );
  return rows.map((row) => row.memoDate);
}
export async function addDailyMemo(memoDate: string, content: string) {
  const db = await dbPromise;
  const now = new Date().toISOString(),
    memo: DailyMemo = {
      id: uuid(),
      memoDate,
      content,
      pinned: false,
      images: [],
      createdAt: now,
      updatedAt: now,
    };
  await db.runAsync(
    "INSERT INTO daily_memos VALUES(?,?,?,?,?,?)",
    memo.id,
    memo.memoDate,
    memo.content,
    0,
    now,
    now,
  );
  return memo;
}
export async function updateDailyMemo(
  id: string,
  content: string,
  pinned: boolean,
) {
  const db = await dbPromise;
  await db.runAsync(
    "UPDATE daily_memos SET content=?,pinned=?,updated_at=? WHERE id=?",
    content,
    pinned ? 1 : 0,
    new Date().toISOString(),
    id,
  );
}
export async function deleteDailyMemo(id: string) {
  const db = await dbPromise;
  await db.runAsync("DELETE FROM daily_memos WHERE id=?", id);
}
export async function addMemoImage(
  memoId: string,
  fileName: string,
  relativePath: string,
) {
  const db = await dbPromise;
  const image: MemoImage = {
    id: uuid(),
    memoId,
    fileName,
    relativePath,
    createdAt: new Date().toISOString(),
  };
  await db.runAsync(
    "INSERT INTO memo_images VALUES(?,?,?,?,?)",
    image.id,
    image.memoId,
    image.fileName,
    image.relativePath,
    image.createdAt,
  );
  return image;
}
export async function deleteMemoImage(id: string) {
  const db = await dbPromise;
  await db.runAsync("DELETE FROM memo_images WHERE id=?", id);
}
export async function listSpeechTerms(): Promise<SpeechTerm[]> {
  const db = await dbPromise;
  return db
    .getAllAsync<SpeechTermRow>(
      "SELECT id,term,created_at FROM speech_terms ORDER BY created_at ASC",
    )
    .then((rows) =>
      rows.map((row) => ({
        id: row.id,
        term: row.term,
        createdAt: row.created_at,
      })),
    );
}
export async function addSpeechTerm(term: string) {
  const value = term.trim();
  if (!value) return null;
  const db = await dbPromise;
  const item: SpeechTerm = {
    id: uuid(),
    term: value,
    createdAt: new Date().toISOString(),
  };
  await db.runAsync(
    "INSERT OR IGNORE INTO speech_terms(id,term,created_at) VALUES(?,?,?)",
    item.id,
    item.term,
    item.createdAt,
  );
  return item;
}
export async function deleteSpeechTerm(id: string) {
  const db = await dbPromise;
  await db.runAsync("DELETE FROM speech_terms WHERE id=?", id);
}
export async function listSpeechCorrections(): Promise<SpeechCorrection[]> {
  const db = await dbPromise;
  return db
    .getAllAsync<SpeechCorrectionRow>(
      "SELECT id,wrong_text,correct_text,created_at FROM speech_corrections ORDER BY created_at ASC",
    )
    .then((rows) =>
      rows.map((row) => ({
        id: row.id,
        wrongText: row.wrong_text,
        correctText: row.correct_text,
        createdAt: row.created_at,
      })),
    );
}
export async function addSpeechCorrection(
  wrongText: string,
  correctText: string,
) {
  const wrong = wrongText.trim();
  const correct = correctText.trim();
  if (!wrong || !correct) return null;
  const db = await dbPromise;
  const item: SpeechCorrection = {
    id: uuid(),
    wrongText: wrong,
    correctText: correct,
    createdAt: new Date().toISOString(),
  };
  await db.runAsync(
    "INSERT OR IGNORE INTO speech_corrections(id,wrong_text,correct_text,created_at) VALUES(?,?,?,?)",
    item.id,
    item.wrongText,
    item.correctText,
    item.createdAt,
  );
  return item;
}
export async function deleteSpeechCorrection(id: string) {
  const db = await dbPromise;
  await db.runAsync("DELETE FROM speech_corrections WHERE id=?", id);
}
export async function getSettings() {
  const db = await dbPromise;
  const r = await db.getFirstAsync<SettingsRow>(
    "SELECT default_mode,default_offset_minutes,default_repeat_interval,default_repeat_count FROM app_settings WHERE id=1",
  );
  return r
    ? {
        defaultMode: r.default_mode,
        defaultOffsetMinutes: r.default_offset_minutes,
        defaultRepeatInterval: r.default_repeat_interval,
        defaultRepeatCount: r.default_repeat_count,
      }
    : DEFAULT_SETTINGS;
}
export async function saveSettings(s: AppSettings) {
  const db = await dbPromise;
  await db.runAsync(
    "INSERT OR REPLACE INTO app_settings VALUES(1,?,?,?,?)",
    s.defaultMode,
    s.defaultOffsetMinutes,
    s.defaultRepeatInterval,
    s.defaultRepeatCount,
  );
}
export async function exportData() {
  const dailyMemos = await listDailyMemos();
  return {
    schemaVersion: 6,
    exportedAt: new Date().toISOString(),
    tasks: await listTasks(),
    memos: await (
      await dbPromise
    ).getAllAsync<TaskMemo>(
      "SELECT id,task_id as taskId,content,input_type as inputType,created_at as createdAt FROM task_memos ORDER BY created_at",
    ),
    dailyMemos,
    memoImages: dailyMemos.flatMap((m) => m.images),
    settings: await getSettings(),
    speechTerms: await listSpeechTerms(),
    speechCorrections: await listSpeechCorrections(),
  };
}
export async function importData(raw: unknown, mode: "merge" | "replace") {
  if (!raw || typeof raw !== "object")
    throw new Error("지원하지 않는 백업 파일입니다.");
  const data = raw as Partial<Backup>;
  if (
    ![1, 2, 3, 4, 5, 6].includes(data.schemaVersion ?? 0) ||
    !Array.isArray(data.tasks) ||
    !Array.isArray(data.memos)
  )
    throw new Error("지원하지 않는 백업 파일입니다.");
  const db = await dbPromise;
  await db.withTransactionAsync(async () => {
    if (mode === "replace") {
      await db.runAsync("DELETE FROM daily_memos");
      await db.runAsync("DELETE FROM task_memos");
      await db.runAsync("DELETE FROM tasks");
      await db.runAsync("DELETE FROM speech_terms");
      await db.runAsync("DELETE FROM speech_corrections");
    }
    for (const t of data.tasks!) {
      if (!t.id || !t.title || !t.scheduledAt)
        throw new Error("일정 데이터 형식이 올바르지 않습니다.");
      const reminders: ReminderDraft[] =
        t.reminders?.map((x) => ({
          scheduledAt:
            x.scheduledAt ??
            new Date(
              new Date(t.scheduledAt).getTime() -
                (x.offsetMinutes ?? 10) * 60000,
            ).toISOString(),
          offsetMinutes: x.offsetMinutes,
          mode: x.mode,
        })) ??
        (t.reminderMinutes === null
          ? []
          : [
              {
                scheduledAt: new Date(
                  new Date(t.scheduledAt).getTime() -
                    (t.reminderMinutes ?? 10) * 60000,
                ).toISOString(),
                offsetMinutes: t.reminderMinutes ?? 10,
                mode: "normal",
              },
            ]);
      const draft: TaskDraft = {
        title: t.title,
        description: t.description ?? "",
        scheduledAt: t.scheduledAt,
        status: t.status,
        category: "업무",
        reminderMinutes: reminders[0]?.offsetMinutes ?? null,
        reminders,
        repeat: t.repeat ?? null,
      };
      await db.runAsync("DELETE FROM tasks WHERE id=?", t.id);
      const r = draft.repeat,
        now = new Date().toISOString();
      await db.runAsync(
        "INSERT INTO tasks(id,title,description,scheduled_at,status,category,reminder_minutes,notification_id,repeat_start_offset,repeat_interval,repeat_count,repeat_until_completed,repeat_include_due,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
        t.id,
        draft.title,
        draft.description,
        draft.scheduledAt,
        draft.status,
        "업무",
        draft.reminderMinutes,
        null,
        r?.startOffsetMinutes ?? null,
        r?.intervalMinutes ?? null,
        r?.repeatCount ?? null,
        r?.untilCompleted ? 1 : 0,
        r?.includeDueTime ? 1 : 0,
        t.createdAt ?? now,
        t.updatedAt ?? now,
      );
      await replaceRules(t.id, reminders);
    }
    for (const m of data.memos!)
      if (m.id && m.taskId && m.content)
        await db.runAsync(
          "INSERT OR REPLACE INTO task_memos VALUES(?,?,?,?,?)",
          m.id,
          m.taskId,
          m.content,
          m.inputType === "VOICE" ? "VOICE" : "TEXT",
          m.createdAt ?? new Date().toISOString(),
        );
    for (const m of data.dailyMemos ?? [])
      if (m.id && m.memoDate && typeof m.content === "string")
        await db.runAsync(
          "INSERT OR REPLACE INTO daily_memos VALUES(?,?,?,?,?,?)",
          m.id,
          m.memoDate,
          m.content,
          m.pinned ? 1 : 0,
          m.createdAt ?? new Date().toISOString(),
          m.updatedAt ?? new Date().toISOString(),
        );
    for (const image of data.memoImages ?? [])
      if (image.id && image.memoId && image.fileName && image.relativePath)
        await db.runAsync(
          "INSERT OR REPLACE INTO memo_images VALUES(?,?,?,?,?)",
          image.id,
          image.memoId,
          image.fileName,
          image.relativePath,
          image.createdAt ?? new Date().toISOString(),
        );
    if (data.settings) await saveSettings(data.settings);
    for (const term of data.speechTerms ?? [])
      if (term.id && term.term?.trim())
        await db.runAsync(
          "INSERT OR IGNORE INTO speech_terms(id,term,created_at) VALUES(?,?,?)",
          term.id,
          term.term.trim(),
          term.createdAt ?? new Date().toISOString(),
        );
    for (const correction of data.speechCorrections ?? [])
      if (
        correction.id &&
        correction.wrongText?.trim() &&
        correction.correctText?.trim()
      )
        await db.runAsync(
          "INSERT OR IGNORE INTO speech_corrections(id,wrong_text,correct_text,created_at) VALUES(?,?,?,?)",
          correction.id,
          correction.wrongText.trim(),
          correction.correctText.trim(),
          correction.createdAt ?? new Date().toISOString(),
        );
  });
}
