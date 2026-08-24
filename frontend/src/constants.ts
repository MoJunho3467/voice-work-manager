export const CATEGORIES = ["업무", "거래처", "방문", "전화", "개인", "기타"];
export const CATEGORY_COLORS: Record<string, string> = {
  업무: "#7047E8",
  거래처: "#8B5CF6",
  방문: "#9B6DF2",
  전화: "#6340C7",
  개인: "#B06CE3",
  기타: "#81758F",
};
export const REMINDERS = [
  { label: "알림 없음", value: null },
  { label: "정각", value: 0 },
  { label: "5분 전", value: 5 },
  { label: "10분 전", value: 10 },
  { label: "30분 전", value: 30 },
  { label: "1시간 전", value: 60 },
  { label: "하루 전", value: 1440 },
];
export const NOTIFICATION_MODES = [
  { label: "일반 알림", value: "normal" },
  { label: "음성 안내", value: "voice" },
  { label: "강한 알람", value: "alarm" },
] as const;
export const MODE_LABEL = {
  normal: "일반 알림",
  voice: "음성 안내",
  alarm: "강한 알람",
} as const;
export const STATUS_LABEL = {
  PENDING: "예정",
  IN_PROGRESS: "진행 중",
  COMPLETED: "완료",
} as const;
