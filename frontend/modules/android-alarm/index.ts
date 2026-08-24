import { requireOptionalNativeModule } from "expo-modules-core";

export type NativeAlarmMode = "voice" | "alarm";

type AndroidAlarmModule = {
  schedule(
    requestCode: number,
    atMillis: number,
    title: string,
    message: string,
    mode: NativeAlarmMode,
  ): Promise<string>;
  cancel(requestCode: number): Promise<void>;
  canScheduleExactAlarms(): Promise<boolean>;
  openExactAlarmSettings(): Promise<void>;
  canUseFullScreenIntent(): Promise<boolean>;
  openFullScreenIntentSettings(): Promise<void>;
};

export default requireOptionalNativeModule<AndroidAlarmModule>(
  "AndroidAlarm",
) as AndroidAlarmModule;
