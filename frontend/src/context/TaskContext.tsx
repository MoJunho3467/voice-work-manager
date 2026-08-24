import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { Task, TaskDraft } from "../types";
import * as DB from "../services/database";
import {
  cancelTaskNotifications,
  configureNotifications,
  restorePendingNotifications,
  scheduleTaskNotifications,
} from "../services/notifications";
type Ctx = {
  tasks: Task[];
  loading: boolean;
  refresh: () => Promise<void>;
  create: (d: TaskDraft) => Promise<Task>;
  update: (id: string, d: TaskDraft) => Promise<Task>;
  remove: (id: string) => Promise<void>;
  complete: (task: Task) => Promise<void>;
};
const Context = createContext<Ctx | null>(null);
export function TaskProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => setTasks(await DB.listTasks()), []);
  useEffect(() => {
    (async () => {
      await DB.initDatabase();
      await configureNotifications();
      await restorePendingNotifications();
      await refresh();
      setLoading(false);
    })();
  }, [refresh]);
  const create = async (d: TaskDraft) => {
    let t = await DB.createTask(d);
    await scheduleTaskNotifications(t);
    t = (await DB.getTask(t.id))!;
    await refresh();
    return t;
  };
  const update = async (id: string, d: TaskDraft) => {
    const old = await DB.getTask(id);
    if (old) await cancelTaskNotifications(old);
    let t = await DB.updateTask(id, d);
    await scheduleTaskNotifications(t);
    t = (await DB.getTask(id))!;
    await refresh();
    return t;
  };
  const remove = async (id: string) => {
    const t = await DB.getTask(id);
    if (t) await cancelTaskNotifications(t);
    await DB.deleteTaskRow(id);
    await refresh();
  };
  const complete = async (t: Task) => {
    await update(t.id, {
      title: t.title,
      description: t.description,
      scheduledAt: t.scheduledAt,
      status: "COMPLETED",
      category: t.category,
      reminderMinutes: t.reminderMinutes,
      reminders: t.reminders.map((r) => ({
        scheduledAt: r.scheduledAt,
        offsetMinutes: r.offsetMinutes,
        mode: r.mode,
      })),
      repeat: t.repeat,
    });
  };
  return (
    <Context.Provider
      value={{ tasks, loading, refresh, create, update, remove, complete }}
    >
      {children}
    </Context.Provider>
  );
}
export const useTasks = () => {
  const c = useContext(Context);
  if (!c) throw new Error("TaskProvider가 필요합니다.");
  return c;
};
