# Career Tracker

풀스택 개발자의 일일 작업을 자동/수동으로 기록하고, 이력서 작성 시 활용할 수 있는 데스크탑 앱.

---

## 기술 스택

| 구분 | 기술 |
|------|------|
| 런타임 | Electron 42 |
| 프론트엔드 | React 19 + Vite 8 + TypeScript 6 |
| DB | better-sqlite3 (로컬 SQLite) |
| Git 연동 | simple-git |

---

## 주요 기능

### ☀️ 오늘
- 오늘 할 일 목록 추가 / 완료 체크 / 삭제
- 오늘 자동 수집된 Git 커밋 목록

### 📋 타임라인
- 하루 기록을 시간순으로 표시
- 체크인(보라) / Git 커밋(초록) 시각적 구분
- 날짜 이동 (◀ ▶)

### 📁 아카이브
- 전체 기록 통계 (총 기록 수 / 커밋 수 / 작업 일수)
- 날짜 범위 필터
- 마크다운 내보내기 → Claude에 붙여넣어 이력서 문구 생성

### ⚙️ 설정
- 모닝 루틴 알림 시간 설정
- 체크인 주기 설정 (1h / 2h / 3h)
- 퇴근 마무리 알림 토글 + 시간 설정
- 작업 유형 커스텀 (추가 / 삭제 / 색상 지정)
- 기술 스택 커스텀 (추가 / 삭제)
- Git 레포 경로 등록 (복수 가능)

### ✏️ 체크인 모달
- 작업 유형 단일 선택
- 기술 스택 복수 선택 + **인라인 즉시 추가**
- 작업 내용 / 임팩트 입력

---

## 프로젝트 구조

```
career-tracker/
├── electron-src/          # Electron 메인 프로세스 (TypeScript)
│   ├── main.ts            # 앱 진입점, 알림 스케줄러, IPC 핸들러
│   ├── preload.ts         # IPC 브릿지 (contextBridge)
│   ├── db.ts              # SQLite 연결 & 전체 쿼리
│   └── git-collector.ts   # Git 커밋 자동 수집 + 기술스택 추론
├── electron/              # 컴파일된 Electron JS (자동 생성)
├── src/                   # React 프론트엔드
│   ├── pages/
│   │   ├── Today.tsx      # 오늘 페이지
│   │   ├── Timeline.tsx   # 타임라인 페이지
│   │   ├── Archive.tsx    # 아카이브 페이지
│   │   └── Settings.tsx   # 설정 페이지
│   ├── components/
│   │   ├── CheckinModal.tsx
│   │   └── TodoModal.tsx
│   ├── api.ts             # window.api 타입 래퍼 (mock fallback 포함)
│   ├── types.ts           # 공통 타입 정의
│   └── App.tsx            # 루트 컴포넌트 + 레이아웃
├── tsconfig.electron.json # Electron용 TS 설정 (CommonJS)
├── tsconfig.app.json      # React용 TS 설정
└── vite.config.ts
```

---

## DB 스키마

```sql
-- 체크인 & Git 커밋 통합 로그
CREATE TABLE logs (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp    TEXT NOT NULL,
  source       TEXT NOT NULL,   -- 'checkin' | 'git'
  work_type    TEXT,
  techs        TEXT,            -- JSON array ["React","TypeScript"]
  description  TEXT,
  impact       TEXT,
  repo         TEXT,
  commit_hash  TEXT
);

CREATE TABLE todos (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  date      TEXT NOT NULL,      -- YYYY-MM-DD
  content   TEXT NOT NULL,
  work_type TEXT,
  done      INTEGER DEFAULT 0
);

CREATE TABLE settings  (key TEXT PRIMARY KEY, value TEXT);
CREATE TABLE work_types (id INTEGER PRIMARY KEY AUTOINCREMENT, label TEXT, color TEXT, sort_order INTEGER);
CREATE TABLE tech_tags  (id INTEGER PRIMARY KEY AUTOINCREMENT, label TEXT);
```

DB 파일 위치: `%APPDATA%\career-tracker\career-tracker.db`

---

## 개발 환경 실행

```bash
# 의존성 설치
npm install

# 앱 실행 (Vite dev server + Electron)
npm run dev
```

> 처음 실행 시 `electron-src/` 코드가 자동 컴파일된 후 앱 창이 열립니다.

### 네이티브 모듈 빌드 오류 시

```bash
npx electron-rebuild -f -w better-sqlite3
npm run dev
```

---

## 배포 (인스톨러 생성)

```bash
npm run electron:build
```

`dist-electron/Career Tracker Setup 1.0.0.exe` 생성 → 배포

---

## 내보내기 포맷 (이력서용)

```markdown
# 작업 이력 — 2025.05.01 ~ 2025.06.01

## 2025.05.14
- 10:00 [체크인] refresh token 만료 로직 구현 (JWT, NestJS, TypeScript)
  - 임팩트: 로그인 실패율 12% 감소
- 14:30 [Git] feat: add error handling middleware (TypeScript, Node.js)
```

아카이브 → 이력서용 내보내기 → 복사 → Claude에 붙여넣기하여 이력서 문구 자동 생성
