# Features 가이드 (기능 모듈)

> **역할**: 기능별 모듈 개발 가이드
> **상위**: `/CLAUDE.md` (루트 헌법)
>
> ⚠️ **필수**: 이 파일을 읽기 전 `/CLAUDE.md` 섹션 0 (컨텍스트 로딩 프로토콜)을 확인하세요.
> 핵심 금지 사항과 전역 원칙은 루트 헌법에서 정의됩니다.

---

## 1. 이 디렉토리 범위

```
/src/features
├── claude.md          # [현재 파일]
└── /space             # 📌 공간 기능 (핵심 모듈)
    ├── /components    # 공간 전용 컴포넌트
    │   ├── SpaceLayout.tsx     # 전체 레이아웃 컨테이너
    │   ├── SpaceHeader.tsx     # 상단 헤더
    │   ├── /sidebar            # 채팅 패널
    │   ├── /video              # 비디오 타일, 참가자 패널
    │   ├── /game               # 게임 캔버스 래퍼
    │   └── /controls           # 하단 컨트롤 바
    ├── /game          # Phaser 게임 엔진
    │   ├── PhaserGame.tsx      # Phaser 인스턴스 래퍼
    │   ├── /scenes             # 게임 씬 (MainScene)
    │   ├── /objects            # 상호작용 오브젝트
    │   ├── /tiles              # 타일 시스템
    │   └── /sprites            # 캐릭터 스프라이트
    ├── /livekit       # LiveKit 연동 (음성/영상)
    ├── /socket        # Socket.io 연동 (실시간 동기화)
    ├── /hooks         # 공간 관련 훅
    ├── /types         # 타입 정의
    └── index.ts       # 통합 export
```

---

## 2. Feature 구조 패턴

### 2.1 기본 구조

```
/features/{feature-name}
├── claude.md           # 기능 로컬 가이드
├── /components         # 기능 전용 컴포넌트
├── /hooks              # 기능 전용 훅
├── /api                # API 라우트 (또는 /app/api에서 import)
├── /types              # 타입 정의
└── index.ts            # 통합 export
```

### 2.2 예시: auth 기능

```
/features/auth
├── claude.md
├── /components
│   ├── LoginForm.tsx
│   ├── SignupForm.tsx
│   └── OAuthButtons.tsx
├── /hooks
│   └── useAuth.ts
├── /types
│   └── auth.types.ts
└── index.ts
```

---

## 3. Feature 개발 규칙

### 3.1 컴포넌트 참조

```tsx
// 공통 UI는 @/components/ui에서
import { Button, Card } from "@/components/ui"

// 기능 전용은 로컬에서
import { LoginForm } from "./components/LoginForm"
```

### 3.2 네이밍 (SID/LID/BTN)

각 Feature의 claude.md에 관련 ID 명시:

```markdown
## 관련 ID

### Screens (SID)
- SID.AUTH.LOGIN.001 - 로그인 페이지
- SID.AUTH.SIGNUP.001 - 회원가입 페이지

### Labels (LID)
- LID.AUTH.LOGIN.TITLE.001 - "로그인"
- LID.AUTH.LOGIN.EMAIL.001 - "이메일"

### Buttons (BTN)
- BTN.AUTH.LOGIN.SUBMIT.001 - 로그인 버튼
- BTN.AUTH.OAUTH.GITHUB.001 - GitHub 로그인
```

### 3.3 상태 관리

- 로컬 상태: React useState
- 서버 상태: React Query / SWR
- 전역 상태: Zustand (필요시)

---

## 4. Feature별 claude.md 템플릿

```markdown
# {Feature Name} 가이드

> **역할**: {기능 설명}
> **상위**: `/src/features/claude.md`

---

## 1. 기능 범위

{이 기능이 담당하는 범위 설명}

## 2. 디렉토리 구조

{폴더 트리}

## 3. 관련 ID

### Screens (SID)
{화면 ID 목록}

### Labels (LID)
{라벨 ID 목록}

### Buttons (BTN)
{버튼 ID 목록}

## 4. 재사용 컴포넌트

{@/components/ui에서 사용하는 컴포넌트}

## 5. 상태/이벤트/가드

{State Machine 정의 - 복잡한 플로우가 있는 경우}

## 6. i18n 톤 규칙

{이 기능에서 사용하는 톤 코드}

---

## 변경 이력

| 날짜 | 변경 |
|-----|------|
```

---

## 5. /docs 참조

| 용도 | 위치 |
|-----|------|
| 네이밍 체계 | `/docs/foundations/naming.md` |
| i18n 규칙 | `/docs/foundations/i18n.md` |
| 접근성 체크리스트 | `/docs/checklists/a11y.md` |
| 새 컴포넌트 프로세스 | `/docs/workflow/new-component.md` |

---

## 6. 새 Feature 추가 절차

> ⚠️ 토큰 효율 원칙: 문서는 요청 시만 작성

```
1. `/src/features/{name}` 디렉토리 생성
2. 기본 구조 생성 (components, hooks, types, index.ts)
3. 관련 ID 정의 (SID/LID/BTN)
4. `/src/features/{name}/claude.md` 작성 (위 템플릿 사용)
5. (선택) 사용자 요청 시 이 파일 디렉토리 구조 업데이트
```

---

## 7. FlowSpace Feature 가이드

### 7.1 Space (/space) - 핵심 모듈

| 항목 | 내용 |
|-----|------|
| 범위 | 2D 메타버스 공간 (게임 캔버스, 비디오, 채팅) |
| 권한 | 게스트/인증 사용자 모두 접근 가능 |
| 상태 | Phaser 게임 상태 + LiveKit + Socket.io |

#### 7.1.1 주요 컴포넌트

| 컴포넌트 | 역할 |
|---------|------|
| `SpaceLayout` | 전체 레이아웃 컨테이너 (react-resizable-panels) |
| `SpaceHeader` | 상단 헤더 (로고, 공간명, 사용자 정보) |
| `ChatPanel` | 좌측 채팅 패널 (리사이즈/숨김 가능) |
| `ParticipantPanel` | 우측 참가자 비디오 그리드 |
| `VideoTile` | 개별 비디오 타일 |
| `GameCanvas` | Phaser 캔버스 래퍼 |
| `ControlBar` | 하단 컨트롤 바 (마이크/카메라/화면공유) |

#### 7.1.2 게임 엔진 구조

| 모듈 | 역할 |
|------|------|
| `PhaserGame.tsx` | Phaser 인스턴스 React 래퍼 |
| `MainScene.ts` | 메인 게임 씬 (맵, 캐릭터, 카메라) |
| `CharacterSprite.ts` | 캐릭터 스프라이트 및 이동 |
| `TileSystem.ts` | 타일맵 렌더링 |
| `InteractiveObject.ts` | 상호작용 오브젝트 |

#### 7.1.3 실시간 연동

| 모듈 | 역할 | 훅 |
|------|------|-----|
| LiveKit | 음성/영상 통화 | `useLiveKit` |
| Socket.io | 위치/상태 동기화, 채팅 | `useSocket` |

---

## 8. 금지 사항

- 루트 전역 원칙 재정의 금지
- 공통 컴포넌트 복사/수정 금지 (확장만 허용)
- 다른 Feature 직접 import 금지 (공유 필요시 /lib로 이동)

---

## 변경 이력

| 날짜 | 변경 |
|-----|------|
| 2025-12-05 | 초기 생성 |
| 2025-12-05 | /docs 참조 섹션 추가, 토큰 효율 원칙 적용 |
| 2025-12-07 | FlowSpace 프로젝트 반영: space 모듈 중심으로 구조 업데이트 |
| 2025-12-07 | LiveKit/Spaces API 보안 강화, 게스트 세션 검증 API 추가 |
| 2025-12-07 | 🔒 보안 강화: participantId/playerId 서버 파생, Socket.io 세션 검증 추가 |
| 2025-12-09 | 아바타 색상 검증 패턴 추가 (space/claude.md 7.2절 참조) |
