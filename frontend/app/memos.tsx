import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomNav } from "@/components/BottomNav";
import { useSpeechInput } from "@/hooks/useSpeechInput";
import {
  addDailyMemo,
  addMemoImage,
  deleteDailyMemo,
  deleteMemoImage,
  listDailyMemoDates,
  listDailyMemos,
  updateDailyMemo,
} from "@/services/database";
import {
  deleteMemoImageFile,
  MAX_MEMO_IMAGES,
  memoImageUri,
  persistMemoImage,
} from "@/services/memoImages";
import type { DailyMemo, MemoImage } from "@/types";
import { localDateKey } from "@/utils/date";
import { appAlert } from "@/components/AppDialog";
import { CollapsibleCalendar } from "@/components/CollapsibleCalendar";

const dateLabel = (key: string) =>
  Number(key.slice(5, 7)) + "월 " + Number(key.slice(8, 10)) + "일 메모";

export default function Memos() {
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState(localDateKey());
  const [memos, setMemos] = useState<DailyMemo[]>([]);
  const [memoDates, setMemoDates] = useState<string[]>([]);
  const [editor, setEditor] = useState(false);
  const [calendarView, setCalendarView] = useState(false);
  const [text, setText] = useState("");
  const [editing, setEditing] = useState<DailyMemo | null>(null);
  const [saving, setSaving] = useState(false);
  const [pickedImages, setPickedImages] = useState<
    ImagePicker.ImagePickerAsset[]
  >([]);
  const [keptImages, setKeptImages] = useState<MemoImage[]>([]);
  const [removedImages, setRemovedImages] = useState<MemoImage[]>([]);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const speech = useSpeechInput((value) => {
    if (value.trim())
      setText((current) =>
        current.trim() ? current.trim() + "\n" + value.trim() : value.trim(),
      );
  });
  const load = useCallback(async () => {
    const [items, dates] = await Promise.all([
      listDailyMemos(selected),
      listDailyMemoDates(),
    ]);
    setMemos(items);
    setMemoDates(dates);
  }, [selected]);
  useEffect(() => {
    load();
  }, [load]);
  const calendarMarks = useMemo(() => {
    const marks: Record<string, any> = {};
    for (const date of memoDates)
      marks[date] = { marked: true, dotColor: "#7047E8" };
    marks[selected] = {
      ...(marks[selected] ?? {}),
      selected: true,
      selectedColor: "#7047E8",
      selectedDotColor: "#FFF",
    };
    return marks;
  }, [memoDates, selected]);
  const open = (memo?: DailyMemo) => {
    setEditing(memo ?? null);
    setText(memo?.content ?? "");
    setKeptImages(memo?.images ?? []);
    setRemovedImages([]);
    setPickedImages([]);
    setEditor(true);
  };
  const closeEditor = () => {
    speech.cancel();
    setEditor(false);
    setEditing(null);
    setText("");
    setKeptImages([]);
    setRemovedImages([]);
    setPickedImages([]);
  };
  const availableSlots =
    MAX_MEMO_IMAGES - keptImages.length - pickedImages.length;
  const addPicked = (assets: ImagePicker.ImagePickerAsset[]) => {
    if (availableSlots <= 0) {
      appAlert(
        "사진 개수 확인",
        "사진은 메모당 최대 " + MAX_MEMO_IMAGES + "장까지 첨부할 수 있습니다.",
      );
      return;
    }
    setPickedImages((v) => [...v, ...assets.slice(0, availableSlots)]);
    if (assets.length > availableSlots)
      appAlert(
        "사진 개수 확인",
        "최대 " + MAX_MEMO_IMAGES + "장까지만 추가했습니다.",
      );
  };
  const takePhoto = async () => {
    if (availableSlots <= 0) return addPicked([]);
    const p = await ImagePicker.requestCameraPermissionsAsync();
    if (!p.granted)
      return appAlert(
        "카메라 권한 필요",
        "사진을 촬영하려면 카메라 권한을 허용해주세요.",
      );
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      quality: 0.85,
    });
    if (!result.canceled) addPicked(result.assets);
  };
  const choosePhotos = async () => {
    if (availableSlots <= 0) return addPicked([]);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: availableSlots,
      orderedSelection: true,
      quality: 0.85,
    });
    if (!result.canceled) addPicked(result.assets);
  };
  const save = async () => {
    if (!text.trim() && !keptImages.length && !pickedImages.length)
      return appAlert("메모 확인", "메모 내용이나 사진을 추가해주세요.");
    setSaving(true);
    try {
      const memo = editing ?? (await addDailyMemo(selected, text.trim()));
      if (editing)
        await updateDailyMemo(editing.id, text.trim(), editing.pinned);
      for (const image of removedImages) {
        await deleteMemoImage(image.id);
        deleteMemoImageFile(image.relativePath);
      }
      for (const asset of pickedImages) {
        const stored = await persistMemoImage(asset, memo.id);
        await addMemoImage(memo.id, stored.fileName, stored.relativePath);
      }
      closeEditor();
      await load();
    } catch (error) {
      appAlert(
        "저장 실패",
        error instanceof Error ? error.message : "메모를 저장하지 못했습니다.",
      );
    } finally {
      setSaving(false);
    }
  };
  const removeMemo = async (memo: DailyMemo) => {
    for (const image of memo.images) deleteMemoImageFile(image.relativePath);
    await deleteDailyMemo(memo.id);
    await load();
  };
  const toggleVoice = () => {
    Keyboard.dismiss();
    if (speech.state === "listening") speech.finish();
    else if (speech.state !== "processing") speech.start();
  };
  return (
    <View style={st.page}>
      <ScrollView
        contentContainerStyle={[
          st.content,
          { paddingTop: 20 + insets.top, paddingBottom: 140 + insets.bottom },
        ]}
      >
        <View style={st.head}>
          <Text style={st.title}>메모</Text>
        </View>
        <View style={st.monthRow}>
          <Text style={st.month}>
            {Number(selected.slice(0, 4))}년 {Number(selected.slice(5, 7))}월
          </Text>
          <Pressable
            style={st.today}
            onPress={() => setSelected(localDateKey())}
          >
            <Text style={st.todayText}>오늘</Text>
          </Pressable>
        </View>
        <CollapsibleCalendar
          selected={selected}
          expanded={calendarView}
          markedDates={calendarMarks}
          onDayPress={(day) => setSelected(day.dateString)}
          onExpandedChange={(expanded) => {
            if (!expanded) setSelected(localDateKey());
            setCalendarView(expanded);
          }}
          theme={{ todayTextColor: "#7047E8", arrowColor: "#7047E8" }}
        />
        <View style={st.section}>
          <Text style={st.sectionTitle}>{dateLabel(selected)}</Text>
          <Text style={st.count}>{memos.length}개</Text>
        </View>
        {memos.length === 0 ? (
          <View style={st.empty}>
            <Text style={st.emptyIcon}>📝</Text>
            <Text style={st.emptyTitle}>이날 작성한 메모가 없습니다</Text>
            <Text style={st.emptySub}>글·음성·사진으로 메모해보세요.</Text>
          </View>
        ) : (
          memos.map((m) => (
            <Pressable
              key={m.id}
              onPress={() => open(m)}
              onLongPress={() =>
                appAlert("메모 관리", "이 메모를 어떻게 할까요?", [
                  {
                    text: m.pinned ? "고정 해제" : "상단 고정",
                    onPress: async () => {
                      await updateDailyMemo(m.id, m.content, !m.pinned);
                      load();
                    },
                  },
                  {
                    text: "삭제",
                    style: "destructive",
                    onPress: () => removeMemo(m),
                  },
                  { text: "취소", style: "cancel" },
                ])
              }
              style={[st.memo, m.pinned && st.pinned]}
            >
              <Text style={st.time}>
                {m.pinned ? "📌  " : ""}
                {new Date(m.createdAt).toLocaleTimeString("ko-KR", {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </Text>
              {m.content ? <Text style={st.memoText}>{m.content}</Text> : null}
              {m.images[0] ? (
                <View>
                  <Image
                    source={{ uri: memoImageUri(m.images[0].relativePath) }}
                    style={st.coverImage}
                  />
                  {m.images.length > 1 ? (
                    <View style={st.imageCountBadge}>
                      <Text style={st.imageCountText}>
                        사진 {m.images.length}장
                      </Text>
                    </View>
                  ) : null}
                </View>
              ) : null}
              <Text style={st.hint}>눌러서 수정 · 길게 눌러 관리</Text>
            </Pressable>
          ))
        )}
      </ScrollView>
      <View style={[st.fabs, { bottom: 84 + insets.bottom }]}>
        <Pressable style={st.fab} onPress={() => open()}>
          <Text style={st.fabPlus}>＋</Text>
          <Text style={st.fabLabel}>메모 추가</Text>
        </Pressable>
      </View>
      <BottomNav active="memos" />
      <Modal
        visible={editor}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={closeEditor}
      >
        <KeyboardAvoidingView
          style={st.overlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={[st.sheet, { paddingBottom: 22 + insets.bottom }]}>
            <View style={st.sheetHeader}>
              <Text style={st.sheetTitle}>
                {editing ? "메모 수정" : "메모 추가"}
              </Text>
              <Text style={st.photoLimit}>
                {keptImages.length + pickedImages.length}/{MAX_MEMO_IMAGES}장
              </Text>
            </View>
            <TextInput
              autoFocus
              multiline
              value={text}
              onChangeText={setText}
              placeholder="기억할 내용을 입력하세요"
              style={st.input}
            />
            {keptImages.length + pickedImages.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={st.photoRow}
              >
                {keptImages.map((image) => (
                  <PhotoTile
                    key={image.id}
                    uri={memoImageUri(image.relativePath)}
                    onPreview={setPreviewUri}
                    onRemove={() => {
                      setKeptImages((v) => v.filter((x) => x.id !== image.id));
                      setRemovedImages((v) => [...v, image]);
                    }}
                  />
                ))}
                {pickedImages.map((asset, index) => (
                  <PhotoTile
                    key={asset.uri + "-" + index}
                    uri={asset.uri}
                    onPreview={setPreviewUri}
                    onRemove={() =>
                      setPickedImages((v) => v.filter((_, i) => i !== index))
                    }
                  />
                ))}
              </ScrollView>
            ) : null}
            {speech.state === "listening" ||
            speech.state === "processing" ||
            speech.state === "failed" ? (
              <View
                style={[
                  st.voiceStatus,
                  speech.state === "failed" && st.voiceFailed,
                ]}
              >
                <Text style={st.voiceStatusText}>
                  {speech.state === "listening"
                    ? "● 듣는 중… 말이 끝나면 자동으로 입력됩니다."
                    : speech.state === "processing"
                      ? "음성을 글자로 바꾸는 중…"
                      : speech.error}
                </Text>
                {speech.state === "listening" && speech.transcript ? (
                  <Text style={st.voicePreview}>{speech.transcript}</Text>
                ) : null}
              </View>
            ) : null}
            <View style={st.attachActions}>
              <Pressable
                style={[
                  st.attachButton,
                  speech.state === "listening" && st.attachButtonActive,
                ]}
                onPress={toggleVoice}
                disabled={speech.state === "processing"}
              >
                <Text style={st.attachIcon}>
                  {speech.state === "listening" ? "■" : "🎤"}
                </Text>
                <Text
                  style={[
                    st.attachText,
                    speech.state === "listening" && st.attachTextActive,
                  ]}
                >
                  {speech.state === "listening"
                    ? "입력 종료"
                    : speech.state === "processing"
                      ? "처리 중…"
                      : "음성 입력"}
                </Text>
              </Pressable>
              <Pressable style={st.attachButton} onPress={takePhoto}>
                <Text style={st.attachIcon}>📷</Text>
                <Text style={st.attachText}>촬영</Text>
              </Pressable>
              <Pressable style={st.attachButton} onPress={choosePhotos}>
                <Text style={st.attachIcon}>▧</Text>
                <Text style={st.attachText}>앨범</Text>
              </Pressable>
            </View>
            <View style={st.actions}>
              <Pressable style={st.cancel} onPress={closeEditor}>
                <Text>취소</Text>
              </Pressable>
              <Pressable
                style={st.save}
                onPress={save}
                disabled={
                  saving ||
                  speech.state === "listening" ||
                  speech.state === "processing"
                }
              >
                <Text style={st.saveText}>{saving ? "저장 중…" : "저장"}</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      <Modal
        visible={Boolean(previewUri)}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewUri(null)}
      >
        <Pressable
          style={st.previewOverlay}
          onPress={() => setPreviewUri(null)}
        >
          {previewUri ? (
            <Image
              source={{ uri: previewUri }}
              style={st.previewImage}
              resizeMode="contain"
            />
          ) : null}
          <Text style={st.previewClose}>닫기</Text>
        </Pressable>
      </Modal>
    </View>
  );
}

function PhotoTile({
  uri,
  onPreview,
  onRemove,
}: {
  uri: string;
  onPreview: (uri: string) => void;
  onRemove: () => void;
}) {
  return (
    <View style={st.photoTile}>
      <Pressable onPress={() => onPreview(uri)}>
        <Image source={{ uri }} style={st.photo} />
      </Pressable>
      <Pressable style={st.removePhoto} onPress={onRemove}>
        <Text style={st.removePhotoText}>×</Text>
      </Pressable>
    </View>
  );
}

const st = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#FAF9FE" },
  content: { padding: 20, paddingBottom: 140, gap: 18 },
  head: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: { fontSize: 34, fontWeight: "900", color: "#171B27" },
  viewWindow: {
    overflow: "hidden",
    backgroundColor: "#FFF",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#E8E3F2",
  },
  calendarContent: { padding: 6 },
  headIcon: { fontSize: 29, color: "#7047E8" },
  monthRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  month: { fontSize: 22, fontWeight: "800", color: "#202330" },
  today: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 14,
    backgroundColor: "#F2EDFF",
  },
  todayText: { color: "#5331C7", fontWeight: "800" },
  weekNav: { flexDirection: "row", alignItems: "center", gap: 3 },
  week: { flex: 1, flexDirection: "row", justifyContent: "space-between" },
  weekArrow: {
    width: 25,
    height: 46,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F2EDFF",
  },
  weekArrowText: {
    fontSize: 30,
    lineHeight: 32,
    color: "#7047E8",
    fontWeight: "700",
  },
  day: {
    width: 36,
    paddingVertical: 7,
    borderRadius: 18,
    alignItems: "center",
    gap: 3,
  },
  dayActive: { backgroundColor: "#7047E8" },
  weekday: { fontSize: 13, fontWeight: "700", color: "#515767" },
  dayNo: { fontSize: 18, fontWeight: "800", color: "#171B27" },
  memoDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: "#7047E8" },
  memoDotHidden: { opacity: 0 },
  memoDotActive: { backgroundColor: "#FFF" },
  white: { color: "#FFF" },
  section: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 8,
  },
  sectionTitle: { fontSize: 22, fontWeight: "900", color: "#171B27" },
  count: { fontSize: 16, fontWeight: "800", color: "#7047E8" },
  memo: {
    padding: 20,
    borderRadius: 20,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E8E3F2",
    gap: 12,
  },
  pinned: { backgroundColor: "#F8F3FF", borderColor: "#CDBEFF" },
  time: { fontSize: 14, color: "#747C8D", fontWeight: "700" },
  memoText: {
    fontSize: 18,
    lineHeight: 27,
    fontWeight: "700",
    color: "#202330",
  },
  coverImage: {
    width: "100%",
    height: 180,
    borderRadius: 14,
    backgroundColor: "#EEEAF7",
  },
  imageCountBadge: {
    position: "absolute",
    right: 10,
    bottom: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: "rgba(29,24,42,.72)",
  },
  imageCountText: { color: "#FFF", fontSize: 12, fontWeight: "800" },
  hint: { fontSize: 11, color: "#A0A6B3" },
  empty: {
    alignItems: "center",
    padding: 35,
    backgroundColor: "#FFF",
    borderRadius: 20,
  },
  emptyIcon: { fontSize: 38 },
  emptyTitle: { fontSize: 17, fontWeight: "800", marginTop: 8 },
  emptySub: { fontSize: 13, color: "#7B8392", marginTop: 5 },
  fabs: { position: "absolute", right: 18, alignItems: "flex-end" },
  fab: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: "#7047E8",
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
  },
  fabPlus: { fontSize: 32, color: "#FFF" },
  fabLabel: { fontSize: 11, color: "#FFF", fontWeight: "800" },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15,18,30,.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    maxHeight: "92%",
    backgroundColor: "#FFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 22,
    gap: 16,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sheetTitle: { fontSize: 21, fontWeight: "900" },
  photoLimit: { fontSize: 13, color: "#7047E8", fontWeight: "800" },
  input: {
    minHeight: 130,
    maxHeight: 240,
    borderWidth: 1,
    borderColor: "#D8CAFA",
    borderRadius: 16,
    padding: 15,
    fontSize: 17,
    textAlignVertical: "top",
  },
  photoRow: { gap: 10, paddingVertical: 2, paddingRight: 8 },
  photoTile: { width: 96, height: 96 },
  photo: {
    width: 96,
    height: 96,
    borderRadius: 14,
    backgroundColor: "#EEEAF7",
  },
  removePhoto: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 25,
    height: 25,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#C23B4A",
    borderWidth: 2,
    borderColor: "#FFF",
  },
  removePhotoText: {
    color: "#FFF",
    fontSize: 19,
    lineHeight: 20,
    fontWeight: "900",
  },
  voiceStatus: {
    padding: 12,
    borderRadius: 13,
    backgroundColor: "#F5F1FF",
    borderWidth: 1,
    borderColor: "#D8CAFA",
    gap: 6,
  },
  voiceFailed: { backgroundColor: "#FFF3F4", borderColor: "#F0B9C0" },
  voiceStatusText: { fontSize: 13, fontWeight: "800", color: "#5331C7" },
  voicePreview: { fontSize: 14, lineHeight: 20, color: "#343847" },
  attachActions: { flexDirection: "row", gap: 9 },
  attachButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F2EDFF",
    borderWidth: 1,
    borderColor: "#DED2FA",
    gap: 4,
  },
  attachButtonActive: { backgroundColor: "#7047E8", borderColor: "#7047E8" },
  attachIcon: { fontSize: 20, color: "#7047E8" },
  attachText: { fontSize: 13, color: "#5331C7", fontWeight: "900" },
  attachTextActive: { color: "#FFF" },
  actions: { flexDirection: "row", gap: 10 },
  cancel: {
    flex: 1,
    padding: 16,
    alignItems: "center",
    backgroundColor: "#F0EDF7",
    borderRadius: 14,
  },
  save: {
    flex: 1,
    padding: 16,
    alignItems: "center",
    backgroundColor: "#7047E8",
    borderRadius: 14,
  },
  saveText: { color: "#FFF", fontWeight: "800" },
  calendarModal: {
    backgroundColor: "#FFF",
    margin: 18,
    marginBottom: 100,
    borderRadius: 24,
    padding: 12,
  },
  cancelWide: {
    padding: 15,
    alignItems: "center",
    backgroundColor: "#F2EDFF",
    borderRadius: 13,
    marginTop: 8,
  },
  previewOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,.92)",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
  },
  previewImage: { width: "100%", height: "82%" },
  previewClose: { color: "#FFF", fontWeight: "900", fontSize: 16, padding: 18 },
});
