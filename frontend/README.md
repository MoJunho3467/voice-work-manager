# Frontend

React Native와 Expo SDK 57로 만든 Android 음성 업무 관리 앱입니다.

## 주요 기능

- 오늘의 업무와 월간 달력
- 일정 생성·수정·삭제 및 완료 처리
- Android 시스템 음성 인식 기반 일정·메모 입력
- 음성 인식 결과 확인 후 저장
- 한국어 상대·절대 날짜와 시간 분석
- SQLite 로컬 저장
- 로컬 알림 예약·변경·취소
- 일정별 일반 알림·음성 안내·강한 알람 방식
- 여러 알림 시점과 음성 반복 규칙
- 알림에서 완료 및 10분 미루기
- JSON 백업·복원

## 폴더 구조

```text
frontend/
├── app/          # Expo Router 화면과 라우트
├── assets/       # 앱 아이콘과 이미지
├── src/
│   ├── components/
│   ├── context/
│   ├── hooks/
│   ├── parser/
│   ├── services/
│   └── utils/
├── app.json
├── eas.json
└── package.json
```

## 설치 및 검사

```bash
npm install
npm run typecheck
npm run lint
npm test
```

## Development build

음성 인식은 네이티브 모듈이므로 Expo Go에서는 실행하지 않습니다.

```bash
npx expo prebuild --platform android
npx expo run:android
npm run dev
```

EAS 개발용 APK:

```bash
npx eas-cli@latest build --platform android --profile development
```

설치용 APK:

```bash
npx eas-cli@latest build --platform android --profile preview
```

## 데이터와 제한사항

- 앱 삭제 시 내부 SQLite도 삭제되므로 먼저 JSON 백업을 내보내야 합니다.
- 설치된 앱의 일정·메모·달력·알림은 서버 없이 동작합니다.
- 음성 인식 가능 여부와 정확도는 Android 기기의 음성 인식 서비스에 따라 달라집니다.
- Android 절전 정책이나 제조사 설정에 따라 알림이 늦어질 수 있습니다.
- 음성 안내 TTS는 앱이 실행 중일 때 일정 내용을 읽습니다. 앱이 종료된 잠금 상태에서는 Android의 높은 우선순위 알림과 기본 알림음으로 대체됩니다.
- 강한 알람은 MAX 중요도 채널, 반복 진동, 고정 알림, 완료·미루기 버튼을 사용합니다. 시계 앱과 같은 전체 화면 강제 표시는 별도 Android 네이티브 모듈 없이는 보장되지 않습니다.
- `SCHEDULE_EXACT_ALARM` 등 Android 권한 변경 때문에 이 버전은 Development Build APK를 다시 만들어야 합니다.
