# 음성 업무수첩

Android 휴대폰에서 사용하는 개인용 음성 기반 업무 관리 앱입니다.

## 프로젝트 구조

```text
voice-work-manager/
├── frontend/   # React Native + Expo 앱
├── backend/    # 향후 서버 기능을 위한 공간(현재 미사용)
├── AGENTS.md
├── CLAUDE.md
└── README.md
```

현재 일정, 메모, 설정은 모두 휴대폰 내부 SQLite에 저장됩니다. 계정, 외부 DB, API 키가 필요하지 않으므로 백엔드 서버를 실행할 필요가 없습니다.

알림 방식과 반복 규칙도 `frontend`의 SQLite와 Android 로컬 알림에서 처리합니다. `backend`는 현재 실행하지 않습니다.

## 앱 실행

```bash
cd frontend
npm install
npm run typecheck
npm run lint
npm test
npm run dev
```

자세한 앱 기능과 APK 빌드 방법은 [frontend/README.md](frontend/README.md)를 참고하세요.

## 백엔드

현재는 서버가 필요하지 않습니다. 이후 로그인, 여러 기기 동기화, 원격 백업 같은 기능을 추가할 때 `backend/`에 구현합니다.
