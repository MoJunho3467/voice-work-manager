# 음성 업무수첩

사촌형 한 명이 Android 휴대폰에서 사용하는 개인용 음성 기반 업무 관리 앱입니다. 서버, 계정, 외부 DB, API 키 없이 일정과 메모를 기기 내부 SQLite에 저장합니다.

## 구현 기능

- 오늘의 업무, 완료 현황, 완료 처리
- 월간 달력과 날짜별 일정
- 일정 생성·수정·삭제, 6개 카테고리, 3개 상태
- Android 시스템 음성 인식 기반 일정/메모 입력
- 음성 인식 결과 확인 후에만 저장
- 한국어 상대/절대 날짜와 시간 규칙 분석
- 모호한 `7시`의 오전/오후 확인
- SQLite 외래키 및 업무 삭제 시 메모 연쇄 삭제
- 로컬 알림 예약·변경·취소와 Android 알림 채널
- JSON 내보내기, 공유, 추가/교체 복원, 알림 재등록
- 음성 실패 시 항상 직접 텍스트 입력 가능

## 요구 환경

- Node.js 22 이상
- Android Studio/Android SDK 또는 EAS Build 계정
- Android 7 이상

## 설치 및 검사

```bash
npm install
npm run typecheck
npm run lint
npm test
```

## Development build

음성 인식은 네이티브 모듈이므로 Expo Go에서는 실행하지 않습니다.

로컬 Android 개발 빌드:

```bash
npx expo prebuild --platform android
npx expo run:android
npm run dev
```

EAS 내부 배포용 개발 APK:

```bash
npx eas-cli@latest login
npx eas-cli@latest build:configure
npx eas-cli@latest build --platform android --profile development
```

## 설치용 APK 만들기

```bash
npx eas-cli@latest build --platform android --profile preview
```

빌드가 끝나면 표시되는 다운로드 주소에서 `.apk`를 내려받습니다. APK를 사촌형 휴대폰으로 전송한 뒤 파일 앱에서 열고, Android가 요청하면 해당 파일 앱의 **알 수 없는 앱 설치 허용**을 켠 다음 설치합니다. Play 스토어 출시는 필요 없습니다.

로컬에서 직접 APK 생성 시:

```bash
npx expo prebuild --platform android
cd android
./gradlew assembleRelease
```

결과 파일은 `android/app/build/outputs/apk/release/app-release.apk`입니다. 로컬 release APK의 서명 키 관리는 실제 장기 배포 전에 별도로 설정해야 하므로, 한 대 설치 목적에는 EAS `preview` APK가 간편합니다.

## 음성 인식 주의사항

`expo-speech-recognition`은 Android에 설치된 시스템 음성 인식 서비스(대개 Google)를 사용합니다. 기기/언어팩/제조사/네트워크 상태에 따라 정확도와 오프라인 가능 여부가 달라집니다. 앱 자체는 어떤 AI API도 호출하지 않으며 API 키도 요구하지 않습니다. 음성 인식이 없거나 권한이 거부돼도 모든 일정과 메모를 직접 입력할 수 있습니다.

## 데이터와 제한사항

- 앱 삭제 시 내부 SQLite도 삭제되므로 설정에서 JSON 백업을 먼저 내보내야 합니다.
- 기기 자체 백업/동기화는 제공하지 않습니다.
- 규칙 파서는 명시된 한국어 날짜·시간 표현을 처리하며 자유로운 자연어 전체를 이해하는 AI는 아닙니다.
- 알림은 Android 절전 정책이나 제조사별 배터리 최적화에 의해 늦어질 수 있습니다.
- EAS 빌드 명령은 빌드 시 인터넷과 무료 Expo 계정이 필요하지만, 설치된 앱의 일정·메모·달력·알림은 서버 없이 작동합니다.
