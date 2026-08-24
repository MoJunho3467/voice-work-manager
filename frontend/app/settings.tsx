import { useCallback, useEffect, useState } from "react";
import {
  AppState,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as Sharing from "expo-sharing";
import { File } from "expo-file-system";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/UI";
import {
  cancelTaskNotifications,
  getAndroidAlarmPermissions,
  openExactAlarmSettings,
  openFullScreenAlarmSettings,
  scheduleTaskNotifications,
} from "@/services/notifications";
import { exportData, importData, listTasks } from "@/services/database";
import { createBackupZip, restoreBackupZip } from "@/services/backup";
import { useTasks } from "@/context/TaskContext";
import { appAlert } from "@/components/AppDialog";
import { router } from "expo-router";

export default function Settings() {
  const insets = useSafeAreaInsets();
  const { tasks, refresh } = useTasks();
  const [permissions, setPermissions] = useState({
    exact: false,
    fullScreen: false,
  });
  const check = useCallback(async () => {
    if (Platform.OS === "android")
      setPermissions(await getAndroidAlarmPermissions());
  }, []);
  useEffect(() => {
    check();
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") check();
    });
    return () => sub.remove();
  }, [check]);
  const backup = async () => {
    try {
      const file = await createBackupZip();
      if (await Sharing.isAvailableAsync())
        await Sharing.shareAsync(file.uri, {
          mimeType: "application/zip",
          dialogTitle: "업무 데이터와 사진 백업 저장",
        });
      else appAlert("백업 완료", file.uri);
    } catch (error) {
      appAlert(
        "백업 실패",
        error instanceof Error ? error.message : "파일을 만들 수 없습니다.",
      );
    }
  };
  const finishRestore = async () => {
    const restored = await listTasks();
    for (const task of restored) await scheduleTaskNotifications(task);
    await refresh();
    appAlert(
      "복원 완료",
      restored.length + "개의 일정과 메모 사진을 불러왔습니다.",
    );
  };
  const restoreZip = async (uri: string, mode: "merge" | "replace") => {
    try {
      for (const task of tasks) await cancelTaskNotifications(task);
      await restoreBackupZip(uri, mode);
      await finishRestore();
    } catch (error) {
      appAlert(
        "복원 실패",
        error instanceof Error
          ? error.message
          : "ZIP 백업 파일이 올바르지 않습니다.",
      );
    }
  };
  const restoreJson = async (data: unknown, mode: "merge" | "replace") => {
    try {
      for (const task of tasks) await cancelTaskNotifications(task);
      await importData(data, mode);
      await finishRestore();
    } catch (error) {
      appAlert(
        "복원 실패",
        error instanceof Error
          ? error.message
          : "JSON 백업 파일이 올바르지 않습니다.",
      );
    }
  };
  const choose = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["application/zip", "application/json"],
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    const isZip =
      asset.name.toLowerCase().endsWith(".zip") ||
      asset.mimeType === "application/zip";
    try {
      const data = isZip ? null : JSON.parse(await new File(asset.uri).text());
      appAlert("데이터 복원", "기존 데이터에 추가할까요, 전체 교체할까요?", [
        { text: "취소", style: "cancel" },
        {
          text: "추가",
          onPress: () =>
            isZip ? restoreZip(asset.uri, "merge") : restoreJson(data, "merge"),
        },
        {
          text: "전체 교체",
          style: "destructive",
          onPress: () =>
            isZip
              ? restoreZip(asset.uri, "replace")
              : restoreJson(data, "replace"),
        },
      ]);
    } catch {
      appAlert("잘못된 파일", "유효한 ZIP 또는 JSON 백업 파일이 아닙니다.");
    }
  };
  return (
    <View style={st.page}>
      <ScrollView
        contentContainerStyle={[
          st.content,
          { paddingTop: 20 + insets.top, paddingBottom: 40 + insets.bottom },
        ]}
      >
        <Text style={st.title}>설정</Text>
        <Text style={st.group}>권한 확인</Text>
        <View style={st.card}>
          <Text style={st.cardTitle}>강한 알람 실행 권한</Text>
          <Text style={st.sub}>
            강한 알람을 선택한 일정에서만 사용하는 시스템 권한입니다. 허용
            후에도 이 카드에서 상태를 계속 확인할 수 있습니다.
          </Text>
          <PermissionRow
            label="정확한 알람"
            allowed={permissions.exact}
            onPress={openExactAlarmSettings}
          />
          <PermissionRow
            label="전체 화면 알람"
            allowed={permissions.fullScreen}
            onPress={openFullScreenAlarmSettings}
          />
        </View>
        <Text style={st.group}>음성 인식</Text>
        <Pressable
          style={st.card}
          onPress={() => router.push("/speech-dictionary" as any)}
        >
          <Text style={st.cardTitle}>전문용어 및 자동교정 사전</Text>
          <Text style={st.sub}>
            자주 사용하는 전문용어를 등록하고 잘못 인식된 말을 자동으로
            교정합니다.
          </Text>
        </Pressable>
        <Text style={st.group}>데이터 관리</Text>
        <View style={st.card}>
          <Text style={st.cardTitle}>백업 및 복원</Text>
          <Text style={st.sub}>
            일정·메모·알림과 첨부 사진을 ZIP 파일 하나로 보관합니다. 기존 JSON
            백업도 복원할 수 있습니다.
          </Text>
          <Button title="백업 파일 내보내기" onPress={backup} />
          <Button
            title="백업 파일 복원하기"
            variant="secondary"
            onPress={choose}
          />
        </View>
        <Text style={st.group}>앱 정보</Text>
        <View style={st.card}>
          <Text style={st.cardTitle}>개인용 오프라인 업무수첩</Text>
          <Text style={st.sub}>
            서버나 계정 없이 휴대폰에 저장됩니다. 알림 방식과 정확한 날짜·시간은
            각 일정을 등록할 때 선택합니다.
          </Text>
        </View>
      </ScrollView>
      <BottomNav active="settings" />
    </View>
  );
}

function PermissionRow({
  label,
  allowed,
  onPress,
}: {
  label: string;
  allowed: boolean;
  onPress: () => void;
}) {
  return (
    <View style={st.permission}>
      <View style={{ flex: 1, gap: 5 }}>
        <Text style={st.permissionLabel}>{label}</Text>
        <View style={[st.badge, allowed ? st.allowed : st.needed]}>
          <Text
            style={[st.badgeText, { color: allowed ? "#5331C7" : "#7A657F" }]}
          >
            {allowed ? "✓ 허용됨" : "허용 필요"}
          </Text>
        </View>
      </View>
      <Pressable style={st.settingButton} onPress={onPress}>
        <Text style={st.settingText}>
          {allowed ? "설정 확인" : "권한 열기"}
        </Text>
      </Pressable>
    </View>
  );
}

const st = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#FAF9FE" },
  content: { paddingHorizontal: 20, gap: 16 },
  title: {
    fontSize: 34,
    fontWeight: "900",
    color: "#171B27",
    marginBottom: 10,
  },
  group: { fontSize: 16, fontWeight: "800", color: "#6E7585", marginTop: 10 },
  card: {
    padding: 19,
    borderRadius: 22,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E8E3F2",
    gap: 15,
  },
  cardTitle: { fontSize: 20, fontWeight: "900", color: "#202330" },
  sub: { fontSize: 14, lineHeight: 21, color: "#747C8D" },
  permission: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#FBF9FF",
    borderWidth: 1,
    borderColor: "#E3D9FA",
  },
  permissionLabel: { fontSize: 16, fontWeight: "900", color: "#252936" },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  allowed: { backgroundColor: "#EEE7FF" },
  needed: { backgroundColor: "#F1EDF4" },
  badgeText: { fontSize: 13, fontWeight: "800" },
  settingButton: {
    paddingHorizontal: 15,
    paddingVertical: 11,
    borderRadius: 13,
    backgroundColor: "#7047E8",
  },
  settingText: { color: "#FFF", fontWeight: "800" },
});
