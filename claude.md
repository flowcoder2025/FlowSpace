# FlowSpace - 루트 가이드 (헌법)

> **프로젝트**: FlowSpace - ZEP-감성 2D 메타버스 플랫폼
> **PRD**: `/docs/prd.md` 참조
>
> **역할**: 전역 원칙 + 네비게이터
> **하위 claude.md**: 각 디렉토리의 개별 기능 가이드

---

## 0. 컨텍스트 로딩 프로토콜 (필수)

> ⚠️ **작업 시작 전 반드시 해당 영역의 claude.md를 먼저 읽으세요**
> Claude Code는 열린 파일 경로 기반으로만 하위 claude.md를 자동 로드합니다.
> 작업 범위가 여러 디렉토리에 걸칠 경우 명시적 로딩이 필요합니다.

### 0.1 계층 구조

```
/CLAUDE.md (루트 헌법 - 전역 원칙, 항상 자동 적용)
│
├── /TASK.md                        ← 🎯 현재 진행 중인 태스크 (Phase별 계획)
│
├── /docs
│   ├── /docs/ROADMAP.md            ← 📋 통합 개발 로드맵 (우선순위/상태)
│   ├── /docs/roadmap/CHARACTER.md  ← 캐릭터 커스터마이징 설계
│   ├── /docs/roadmap/ASSETS.md     ← 에셋 분석 및 가공 계획
│   ├── /docs/roadmap/ASSET-PIPELINE.md ← 에셋 변환 파이프라인
│   └── /docs/infrastructure/OCI.md ← 🔧 Oracle Cloud 인프라 (배포 완료)
│
├── /src/components/claude.md       ← UI 컴포넌트 작업 시 필수
├── /src/features/claude.md         ← 기능 모듈 개발 시 필수
│   └── /src/features/space/claude.md  ← 📌 핵심 모듈 (게임/비디오/채팅)
├── /src/lib/claude.md              ← 백엔드/API/유틸리티 작업 시 필수
└── /server/claude.md               ← Socket.io 서버 작업 시 필수
```

### 0.2 작업 유형별 필수 참조

| 작업 유형 | 필수 참조 파일 | 예시 |
|----------|---------------|------|
| **🎯 계획된 태스크** | `/TASK.md` | Phase별 기능 구현, 진행 상태 |
| **📋 로드맵 확인** | `/docs/ROADMAP.md` | 작업 우선순위, 전체 상태 |
| **🔧 인프라 작업** | `/docs/infrastructure/OCI.md` | 서버 배포, 도메인, SSL 설정 |
| UI/컴포넌트 변경 | `/src/components/claude.md` | 버튼, 카드, 모달 수정 |
| 기능 모듈 개발 | `/src/features/claude.md` | space, auth 기능 추가 |
| **공간 기능 개발** | `/src/features/space/claude.md` | 게임, 비디오, 채팅 수정 |
| 백엔드/API 작업 | `/src/lib/claude.md` | API 라우트, 권한, DB |
| **Socket.io 서버** | `/server/claude.md` | 실시간 동기화, 이벤트 |
| 스타일/브랜딩 | `/src/components/claude.md` | 로고, 색상, 토큰 변경 |
| 전체 프로젝트 | **모든** 하위 claude.md | 대규모 리팩토링 |

### 0.3 적용 우선순위

1. **루트 CLAUDE.md** (이 파일 - 헌법, 최우선)
2. **작업 영역 claude.md** (해당 도메인 규칙)
3. **/docs 상세 스펙** (참조용)

### 0.4 핵심 금지 사항 요약 (전 영역 공통)

> 하위 claude.md를 로드하지 못하더라도 이 규칙은 **항상 적용**

- ❌ 루트 전역 원칙 재정의 금지
- ❌ 버튼 variant 추가 확장 금지 (`default`, `outline`, `destructive`, `ghost`만)
- ❌ 토큰/색상 하드코딩 금지 (`bg-[#xxx]` 금지)
- ❌ 컴포넌트 내 한글 하드코딩 금지 (text-config.ts 사용)
- ❌ 환경 변수 하드코딩 금지
- ❌ SQL 직접 쿼리 금지 (Prisma 사용)
- ❌ 클라이언트에 시크릿 노출 금지

### 0.5 TASK.md 사용법

> 🎯 **TASK.md는 현재 진행 중인 복잡한 태스크의 Phase별 계획을 관리합니다**

**역할**:
- 다단계 기능 구현 시 Phase별 체크리스트 제공
- 구현 진행 상태 추적
- 파일 변경 예정 목록 및 검증 항목 정의

**생성 조건**:
| 상황 | TASK.md 필요 여부 |
|-----|------------------|
| 단순 버그 수정 | ❌ 불필요 |
| 단일 파일 수정 | ❌ 불필요 |
| 3개 이상 파일 수정 | ⚠️ 권장 |
| 새 기능 추가 (Phase 구분 필요) | ✅ 필수 |
| 복잡한 리팩토링 | ✅ 필수 |

**구조**:
```markdown
# TASK: [태스크 제목]
## Phase 1: [단계명]
- [ ] 체크리스트 항목
## Phase 2: ...
## 진행 상태
| Phase | 상태 | 완료일 |
```

### 0.6 TASK.md 라이프사이클

> 📋 **태스크 완료 후 피드백 → 초기화 → 조건부 재생성 플로우**

```
┌─────────────────────────────────────────────────────────────┐
│                    TASK.md 라이프사이클                       │
├─────────────────────────────────────────────────────────────┤
│  1. 생성 (조건 충족 시)                                       │
│     └─ 3개+ 파일 수정 / 새 기능 / 복잡한 작업                  │
│                           ↓                                 │
│  2. 실행 (Phase별 진행)                                       │
│     └─ 체크리스트 완료 → 상태 업데이트 → 커밋                   │
│                           ↓                                 │
│  3. 완료 (모든 Phase ✅)                                      │
│     └─ 사용자에게 완료 보고 + 피드백 요청                       │
│                           ↓                                 │
│  4. 피드백 수집                                               │
│     └─ 추가 수정 필요? → 새 Phase 추가 또는 버그 수정           │
│                           ↓                                 │
│  5. 초기화 (피드백 완료 후)                                    │
│     └─ TASK.md 삭제 또는 아카이브                             │
│                           ↓                                 │
│  6. 대기 (새 태스크까지)                                       │
│     └─ 조건 충족 시 새 TASK.md 생성                           │
└─────────────────────────────────────────────────────────────┘
```

**완료 후 필수 절차**:
1. **완료 보고**: "TASK.md의 모든 Phase가 완료되었습니다. 추가 피드백이 있으신가요?"
2. **피드백 대기**: 사용자 응답 대기
3. **조건부 처리**:
   - 추가 작업 필요 → 새 Phase 추가 또는 수정
   - 완료 확인 → TASK.md 초기화 (삭제 또는 빈 템플릿으로)
4. **다음 태스크**: 새로운 복잡한 작업 요청 시 조건 확인 후 재생성

**현재 태스크**: `/TASK.md` 파일 참조 (없으면 신규 태스크 없음)

### 0.7 AI 어시스턴트 작업 프로토콜 (필수)

> 🤖 **AI 어시스턴트가 작업 시 반드시 따라야 하는 절차**

#### 0.7.1 작업 시작 전 계층 구조 확인 (필수)

```
작업 요청 수신
    ↓
1. /CLAUDE.md 확인 (루트 헌법, 전역 원칙)
    ↓
2. 작업 영역 claude.md 확인 (해당 디렉토리)
    ↓
3. /docs 관련 문서 확인 (PRD, ROADMAP 등)
    ↓
4. /TASK.md 확인 (미완료 항목 있는지)
    ↓
5. Skills 기능 확인 (필요시)
    ↓
작업 시작
```

#### 0.7.2 TASK.md 실시간 관리 (필수)

| 상황 | 절차 |
|-----|------|
| **이전 TASK 완료됨** | 사용자 피드백 받기 → 피드백 반영 → TASK.md 초기화 |
| **이전 TASK 미완료** | 미완료 항목 파악 → 사용자에게 보고 → 피드백 후 진행 |
| **새 태스크 시작** | TASK.md에 계획 작성 → 실시간 진행 상태 업데이트 |

**TASK.md 업데이트 타이밍**:
- 각 체크리스트 항목 완료 시 즉시 ✅ 표시
- Phase 완료 시 상태 테이블 업데이트
- 예상치 못한 이슈 발생 시 문서에 기록

#### 0.7.3 코드-문서 연동 (필수)

| 코드 변경 유형 | 문서 업데이트 대상 |
|--------------|------------------|
| 새 API 추가 | `/docs/prd.md`, 해당 `claude.md` |
| 기능 완료 | `/docs/ROADMAP.md` 상태 업데이트 |
| 버그 수정 | `/TASK.md` (있는 경우) |
| 아키텍처 변경 | `/docs/architecture/flowspace.md` |
| 보안 이슈 해결 | `/docs/ROADMAP.md` 보안 섹션 |

#### 0.7.4 구현 완료 후 검증 프로세스 (필수)

```
구현 완료
    ↓
1. 타입체크: npx tsc --noEmit
    ↓
2. 빌드테스트: npm run build
    ↓
3. (선택) 개발서버 테스트: npm run dev:all
    ↓
4. 관련 문서 업데이트
    ↓
5. Git 커밋: git add . && git commit -m "type: 설명"
    ↓
6. Git 푸시: git push
    ↓
완료 보고
```

**검증 실패 시**:
- 타입 에러 → 코드 수정 후 재검증
- 빌드 에러 → 원인 파악 → 수정 → 재검증
- 에러 해결 불가 시 → 사용자에게 보고 + 도움 요청

---

## 1. 프로젝트 컨텍스트

> ⚠️ **필수**: 작업 시작 전 `/docs/prd.md`를 먼저 읽어 프로젝트 정보를 파악하세요.

### 1.1 FlowSpace 개요

| 항목 | 내용 |
|-----|------|
| **프로젝트명** | FlowSpace |
| **목적** | Phaser 3 + Socket.io + LiveKit 기반 ZEP-감성 2D 웹 메타버스 MVP |
| **핵심 가치** | 브랜딩 + 인증 + 운영/분석 + 실시간 협업을 결합한 상용화 가능한 최소 플랫폼 |
| **타겟 유저** | 운영자(Organizer), 참가자(Participant), 조직 관리자(향후) |

### 1.2 MVP 범위

- **입장/인증**: 게스트 입장, 소셜 로그인, 닉네임/아바타 설정
- **공간 관리**: 공간 생성, 초대 링크, 접근 제어, 템플릿 3종
- **인터랙션**: 오브젝트 상호작용 (링크, 공지, 설문)
- **운영자 대시보드**: 공간별 지표, 이벤트 로그
- **브랜딩**: 로고/테마 컬러/로딩 화면 커스터마이징

### 1.3 UI 시스템 핵심 가치

**"Primary Color만 바꾸면 브랜드 완성"**

- 디자인 토큰 기반 일관된 UI 시스템
- 자연어 요청 시 정의된 룰에 따라 완성형 UI 생성
- 프로젝트 독립적 재사용 가능한 구조

---

## 2. 기술 스택

### 2.1 플랫폼 레이어

| 영역 | 기술 | 역할 |
|-----|------|------|
| Framework | Next.js 15 + React 19 + TypeScript | 플랫폼 UI |
| Styling | Tailwind CSS 4 + shadcn/ui (new-york) | 디자인 시스템 |
| Database | Supabase PostgreSQL + Prisma ORM | 데이터 저장 |
| Auth | NextAuth.js | 인증/권한 |
| Deploy | Vercel | 호스팅 |

### 2.2 게임 & 실시간 레이어

| 영역 | 기술 | 역할 |
|-----|------|------|
| Game Engine | Phaser 3 | 2D 맵 렌더링, 캐릭터 이동 |
| Real-time | Socket.io | 위치/상태 동기화, 채팅 |
| Video/Voice | LiveKit | 음성/영상 통화 |
| UI Panels | react-resizable-panels | 리사이즈 가능 패널 |
| Drag & Drop | @dnd-kit/core | 드래그 가능 비디오 |

**참조 스킬**: `fdp-backend-architect` (백엔드 아키텍처)

---

## 3. 디렉토리 구조 & 네비게이션

```
/FlowSpace
├── CLAUDE.md                        # [현재 파일] 루트 헌법
├── TASK.md                          # 🎯 현재 태스크 계획 (있을 때만)
│
├── /src
│   ├── /app                         # Next.js App Router
│   │   ├── globals.css              # 디자인 토큰 정의
│   │   ├── /admin                   # SuperAdmin 전용 페이지
│   │   │   └── /spaces/[id]         # 개별 공간 관리 (멤버/통계)
│   │   ├── /dashboard               # OWNER/STAFF 관리 페이지
│   │   │   └── /spaces/[id]         # 대시보드 공간 관리
│   │   ├── /my-spaces               # 📌 내 참여 공간 목록 (Member용)
│   │   ├── /spaces                  # 공간 목록, 초대 코드 입장
│   │   ├── /space/[id]              # 개별 공간 페이지 (메인 진입점)
│   │   ├── /login                   # 로그인 페이지
│   │   ├── /profile                 # 프로필 페이지
│   │   └── /api                     # API 라우트 (27개)
│   │       ├── /auth                # 인증 API
│   │       ├── /spaces/[id]         # 공간 CRUD + 멤버 관리 API
│   │       ├── /admin               # SuperAdmin API
│   │       ├── /dashboard           # Dashboard API
│   │       ├── /my-spaces           # 참여 공간 목록 API
│   │       ├── /guest               # 게스트 API
│   │       └── /livekit             # LiveKit 토큰 API
│   │
│   ├── /components                  # 공통 UI 컴포넌트
│   │   ├── claude.md                # → 컴포넌트 가이드
│   │   ├── /ui                      # shadcn/ui + 커스텀
│   │   ├── /space                   # 📌 공간 관리 컴포넌트 (SSOT)
│   │   │   ├── MemberManagement.tsx # 멤버 관리 (통합 SSOT)
│   │   │   ├── MemberList.tsx       # 멤버 목록
│   │   │   ├── MemberSearchInput.tsx# 멤버 검색
│   │   │   ├── RoleBadge.tsx        # 역할 뱃지
│   │   │   └── index.ts             # 통합 export
│   │   └── /providers               # 전역 프로바이더
│   │
│   ├── /features                    # 기능 모듈
│   │   ├── claude.md                # → 기능 개발 가이드
│   │   └── /space                   # 📌 공간 기능 모듈 (핵심)
│   │       ├── claude.md            # → 공간 모듈 상세 가이드
│   │       ├── /components          # 공간 전용 컴포넌트
│   │       │   ├── SpaceLayout.tsx  # 전체 레이아웃 컨테이너
│   │       │   ├── SpaceHeader.tsx  # 상단 헤더
│   │       │   ├── MemberPanel.tsx  # 참가자/멤버 패널
│   │       │   ├── ParticipantEntryModal.tsx # 입장 모달
│   │       │   ├── SpaceSettingsModal.tsx    # 설정 모달
│   │       │   ├── /chat            # 플로팅 채팅
│   │       │   ├── /video           # 비디오 타일
│   │       │   ├── /game            # 게임 캔버스 래퍼
│   │       │   └── /controls        # 하단 컨트롤 바
│   │       ├── /game                # Phaser 게임 엔진
│   │       │   ├── PhaserGame.tsx   # Phaser 인스턴스 래퍼
│   │       │   ├── /scenes          # 게임 씬 (MainScene)
│   │       │   ├── /objects         # 상호작용 오브젝트
│   │       │   ├── /tiles           # 타일 시스템
│   │       │   └── /sprites         # 캐릭터 스프라이트
│   │       ├── /livekit             # LiveKit 연동
│   │       ├── /socket              # Socket.io 연동
│   │       ├── /hooks               # 공간 관련 훅
│   │       └── /types               # 타입 정의
│   │
│   ├── /lib                         # 유틸리티 & 백엔드
│   │   ├── claude.md                # → 백엔드/권한 가이드
│   │   ├── space-auth.ts            # 📌 공간 권한 미들웨어
│   │   └── space-permissions.ts     # 📌 역할 비교 유틸
│   │
│   └── /hooks                       # 전역 훅
│
├── /server                          # Socket.io 서버
│   ├── claude.md                    # → 서버 가이드
│   └── socket-server.ts             # 메인 서버 파일
├── /prisma
│   └── schema.prisma                # DB 스키마
│
├── /public
│   └── /assets/game                 # 게임 에셋 (맵, 스프라이트)
│
├── /docs                            # 상세 스펙 (SSOT) - 자동 생성 금지
│   ├── prd.md                       # 📌 제품 요구사항 문서
│   ├── ROADMAP.md                   # 📋 통합 개발 로드맵
│   ├── /roadmap                     # 로드맵 하위 문서
│   │   ├── CHARACTER.md             # 캐릭터 커스터마이징 설계
│   │   └── ASSETS.md                # 에셋 분석 및 가공 계획
│   ├── /architecture                # 시스템 개요
│   ├── /foundations                 # 전역 규칙
│   ├── /checklists                  # 품질 검증 리스트
│   └── /changes                     # 변경 이력
│
└── /tests
```

### 3.1 ZEP 스타일 UI 레이아웃

```
┌──────────────────────────────────────────────────────────────────┐
│ Header: [Logo] [Space Name] ─────────────────── [User] [Exit]    │
├──────────┬─────────────────────────────────────┬─────────────────┤
│          │                                      │                 │
│  Chat    │        Game Canvas (Phaser 3)       │  Participants   │
│  Panel   │                                      │     Panel       │
│ (resize) │    ┌─────────────────────────┐      │                 │
│          │    │  Character + Map        │      │  ┌──────────┐   │
│  ┌────┐  │    │                         │      │  │  Video   │   │
│  │msg │  │    │                         │      │  │  Grid    │   │
│  │msg │  │    └─────────────────────────┘      │  └──────────┘   │
│  │msg │  │                                      │                 │
│  └────┘  │                                      │                 │
├──────────┴─────────────────────────────────────┴─────────────────┤
│ Control Bar: [Mic] [Camera] [Screen] [Chat] [Participants] [⚙️]  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 4. 전역 원칙 (변경 금지)

### 4.1 디자인 토큰 원칙

> **"Primary Color만 바꾸면 전역 반영"**

```css
:root {
  --primary: hsl(168 64% 50%);   /* 이 값만 변경 → 브랜드 변경 */
  --primary-foreground: hsl(0 0% 100%);
}
```

- 모든 색상은 CSS Variables 참조
- 하드코딩된 색상 사용 **금지** (`bg-[#xxx]` 금지)

### 4.2 버튼 전역 제한

#### 주사용 버튼 (Primary Use)

| Variant | 용도 | 사용 빈도 |
|---------|------|----------|
| `default` | Primary 액션 (CTA) | ⭐⭐⭐ 매우 높음 |
| `outline` | Secondary 액션 | ⭐⭐⭐ 매우 높음 |

#### 예비 버튼 (Reserved - 사용자 승인 시)

| Variant | 용도 | 사용 조건 |
|---------|------|----------|
| `destructive` | 위험 액션 (삭제 등) | 사용자 명시적 요청 시 |
| `ghost` | 최소 강조 | 사용자 명시적 요청 시 |

**규칙**:
- 기본적으로 `default` + `outline`만 사용
- 예비 버튼은 사용자가 요청할 때만 적용
- **버튼 variant 추가 확장 금지**
- 하위 claude.md에서 재정의 금지

#### 버튼 Hover 스타일 규칙

| Variant | Hover 시 스타일 |
|---------|----------------|
| `default` | 배경 어둡게 (primary/90), 그림자 + 상승 효과 |
| `outline` | **테두리 → primary, 텍스트 → primary, 배경 → 투명 유지** |
| `destructive` | 배경 어둡게 (destructive/90), 그림자 + 상승 효과 |
| `ghost` | 배경 accent 적용 |

> ⚠️ **outline 버튼 hover 필수 규칙**: 배경색 변경 금지, 테두리와 텍스트만 primary로 변경

### 4.3 네이밍 체계

```
{TYPE}.{DOMAIN}.{CONTEXT}.{NUMBER}
```

| TYPE | 용도 | 예시 |
|------|------|------|
| SID | Screen ID | `SID.AUTH.LOGIN.001` |
| LID | Label ID | `LID.MODAL.DELETE.001` |
| BTN | Button ID | `BTN.PRIMARY.SUBMIT.001` |

### 4.4 i18n 원칙

- 모든 UI 텍스트는 `text-config.ts`에서 관리
- 컴포넌트 내 하드코딩 한글 **금지**
- 톤 코드 체계:

| 톤 코드 | 용도 | 예시 |
|--------|------|------|
| `Confirm` | 긍정적 확인 | "저장되었습니다" |
| `Destructive` | 파괴적/위험 | "삭제하시겠습니까?" |
| `Soft` | 부드러운 안내 | "입력해 주세요" |
| `Neutral` | 중립적 정보 | "총 3개" |

### 4.5 접근성 (a11y)

**기본 원칙**:
- **WCAG 2.1 Level AA** 준수
- 색상 대비 4.5:1 이상
- 모든 인터랙션 키보드 접근 가능

**모달 접근성 필수 요구사항**:
- 열릴 때 포커스가 모달 내부로 이동
- Tab 키로 모달 내부만 순환 (포커스 트랩)
- ESC 키로 닫기
- 닫힐 때 트리거 요소로 포커스 복귀
- `role="dialog"` + `aria-modal="true"`
- `aria-labelledby` 또는 `aria-label` 필수

**상태도 작성 규칙 (State Machine)**:
```yaml
States: [CLOSED, OPENING, OPEN, CLOSING]

Events:
  - OPEN_MODAL: 모달 열기 요청
  - CLOSE_MODAL: 모달 닫기 요청
  - ANIMATION_END: 애니메이션 완료

Guards:
  - canOpen: "currentState === CLOSED"
  - canClose: "currentState === OPEN"

Transitions:
  CLOSED → OPENING: Event=OPEN_MODAL, Guard=canOpen
  OPENING → OPEN: Event=ANIMATION_END
  OPEN → CLOSING: Event=CLOSE_MODAL, Guard=canClose
  CLOSING → CLOSED: Event=ANIMATION_END
```

---

## 5. 개발 프로세스

### 5.0 개발 서버 실행 (필수)

> ⚠️ **작업 시작 전 개발 서버를 반드시 실행하세요**

```bash
npm run dev:all    # Next.js + Socket.io + LiveKit 동시 실행 (권장)
```

**개별 실행 (필요시)**:
```bash
npm run dev        # Next.js (port 3000)
npm run socket:dev # Socket.io (port 3001)
npm run livekit:dev # LiveKit 개발 서버 (port 7880)
```

| 서버 | 포트 | 역할 |
|-----|------|------|
| Next.js | 3000 | 메인 웹 애플리케이션 |
| Socket.io | 3001 | 위치/상태 동기화, 채팅 |
| LiveKit | 7880 | 음성/영상 통화 |

**테스트 URL**: `http://localhost:3000/space/test?dev=true`

### 5.1 워터폴 (스펙 선행)

```
요구사항 → 네이밍 → 토큰 → 컴포넌트 → 상태도 → i18n → 구현
```

### 5.2 애자일 (Feature Batch)

- 배치 크기: 연관 화면 1~3개 / 2~5일 분량
- 완료 기준: 동작 확인 + 에러 없음

---

## 6. 응답 & 문서 정책 (토큰 효율)

### 6.1 핵심 원칙 (필수 준수)

```
1. 문서(/docs)는 자동으로 생성/갱신하지 않는다
2. 문서 업데이트는 사용자가 명시적으로 요청할 때만 수행
3. 문서 업데이트 시 전체 재작성 금지, 변경된 범위의 델타만 기록
4. 구현은 Feature Batch 단위, 문서 정리는 배치 종료 후 선택
5. 응답 형식: (1) 설계 요약 → (2) 코드, 상세 문서는 요청 시만
```

### 6.2 응답 기본 형식

```
✅ 기본 응답: 설계 요약 (3~5줄) + 코드
❌ 금지: 매 요청마다 문서 자동 생성
```

### 6.3 문서 업데이트 트리거

| 상황 | 문서 작업 |
|-----|----------|
| 코딩 요청 | ❌ 문서 작성 안함 |
| Feature Batch 완료 | ⏳ 사용자 요청 시만 |
| "문서 업데이트해줘" | ✅ 델타만 업데이트 |
| 새 컴포넌트 추가 | 📋 체크리스트로 검증 |

### 6.4 델타 업데이트 규칙

- 전체 문서 재작성 **금지**
- 추가/수정된 섹션만 업데이트
- `/docs/changes/changelog.md`에 변경 기록

---

## 7. 충돌 해결

### 7.1 우선순위

1. **루트 CLAUDE.md** (이 파일)
2. 하위 claude.md
3. /docs 상세 스펙

### 7.2 하위 claude.md 제약

- 전역 원칙 재정의 **금지**
- 버튼 variant 확장 **금지**
- 토큰 네이밍 변경 **금지**

---

## 8. 작업 마무리 프로세스

### 8.1 필수 단계

1. **최종 피드백 확인**: 마무리 전 사용자에게 피드백 요청
2. **문서 업데이트**: 변경사항 발생 시 관련 `claude.md` 파일 먼저 수정
3. **품질 검증**: 타입체크 + 빌드테스트 실행
4. **버전 관리**: 커밋 + 푸쉬

### 8.2 검증 명령어

```bash
npx tsc --noEmit      # 타입체크
npm run build         # 빌드테스트
git add . && git commit -m "feat: 작업 내용" && git push
```

### 8.3 프로세스 순서

```
작업 완료 → 피드백 요청 → claude.md 업데이트 → 타입체크 → 빌드 → 커밋 → 푸쉬
```

---

## 변경 이력

| 날짜 | 버전 | 변경 |
|-----|------|------|
| 2025-12-05 | 1.0.0 | 초기 생성 |
| 2025-12-05 | 1.1.0 | 계층 분리 (헌법만 유지) |
| 2025-12-05 | 2.0.0 | PRD 참조 방식 + 버튼 규칙 명확화 + 접근성 강화 |
| 2025-12-05 | 2.1.0 | 토큰 효율 원칙 추가 + /docs 구조 개선 |
| 2025-12-05 | 2.2.0 | 버튼 Hover 스타일 규칙 추가 (outline: 배경 투명 유지) |
| 2025-12-07 | 3.0.0 | FlowSpace 프로젝트 반영: 프로젝트 정보, 기술 스택, 디렉토리 구조 업데이트 |
| 2025-12-07 | 3.1.0 | 개발 서버 실행 가이드 추가 (npm run dev:all 권장) |
| 2025-12-08 | 3.2.0 | 계층구조 확장: space/claude.md, server/claude.md 추가, PRD 로드맵 업데이트 |
| 2025-12-11 | 3.3.0 | TASK.md 계층 추가: Phase별 태스크 관리 체계, 사용법 가이드 (0.5절) |
| 2025-12-15 | 3.4.0 | 디렉토리 구조 전면 업데이트: /my-spaces, /dashboard, /components/space, space-auth.ts 반영 |
| 2025-12-29 | 3.5.0 | ROADMAP 계층 추가: /docs/ROADMAP.md 통합 로드맵 + roadmap/CHARACTER.md, ASSETS.md |
| 2026-01-08 | 3.6.0 | 계층 구조 확장: OCI.md, DOCS-UPDATE-PLAN.md, ASSET-PIPELINE.md 추가 |
| 2026-01-08 | 3.7.0 | AI 작업 프로토콜 추가 (0.7절): 계층 구조 확인, TASK.md 실시간 관리, 코드-문서 연동, 검증 프로세스 |
| 2026-01-09 | 3.8.0 | OCI 배포 완료: OCI.md → /docs/infrastructure/OCI.md 이동, 인프라 작업 유형 추가 |


## DocOps

> 문서 기반 SSOT 관리 시스템 - 할루시네이션/드리프트 0% 목표

### 핵심 원칙

1. **Evidence 없는 Contract는 존재할 수 없다**
2. **Snapshot(코드) ↔ Contract(문서) 매핑**으로 드리프트 탐지

### DocOps Skills

| Skill | 용도 | 시점 |
|-------|------|------|
| `/docops-init` | 프로젝트에 DocOps 적용 | 최초 1회 |
| `/docops-verify` | 드리프트 검증 | **세션 시작 시 필수** |
| `/docops-finish` | 작업 완료 워크플로우 | 작업 완료 시 |
| `/docops-status` | 현재 상태 확인 | 수시 |

### 세션 워크플로우

```
1. /docops-verify      ← 세션 시작 (드리프트 확인)
2. 작업 수행...
3. /docops-finish      ← 작업 완료 (검증 + 커밋 + 푸시)
```

### 상세 문서

- [docs/00_ssot/ANCHOR.md](docs/00_ssot/ANCHOR.md) - DocOps 진입점
- [docs/00_ssot/DOC_POLICY.md](docs/00_ssot/DOC_POLICY.md) - 규칙 정의
- [docs/00_ssot/DOCOPS_SPEC_V3.2.md](docs/00_ssot/DOCOPS_SPEC_V3.2.md) - 전체 스펙
