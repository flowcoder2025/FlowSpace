# FlowSpace

> **ZEP-감성 2D 메타버스 플랫폼**

Phaser 3 + Socket.io + LiveKit 기반 브라우저 2D 웹 메타버스 MVP

---

## 핵심 가치

- **브랜딩 + 인증 + 운영/분석 + 실시간 협업**을 결합한 상용화 가능한 최소 플랫폼
- **Primary Color만 바꾸면 브랜드 완성** - 디자인 토큰 기반 UI 시스템
- **ZEP 스타일 UI**: 좌측 채팅, 중앙 게임 캔버스, 우측 참가자 비디오

---

## 기술 스택

### 플랫폼 레이어

| 영역 | 기술 |
|-----|------|
| Framework | Next.js 15 + React 19 + TypeScript |
| Styling | Tailwind CSS 4 + shadcn/ui (new-york) |
| Database | Supabase PostgreSQL + Prisma ORM |
| Auth | NextAuth.js |
| Deploy | Vercel |

### 게임 & 실시간 레이어

| 영역 | 기술 |
|-----|------|
| Game Engine | Phaser 3 (2D 맵 렌더링, 캐릭터 이동) |
| Real-time | Socket.io (위치/상태 동기화, 채팅) |
| Video/Voice | LiveKit (음성/영상 통화) |
| UI Panels | react-resizable-panels |

---

## 시작하기

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# Socket.io 서버 실행 (별도 터미널)
npm run server

# 빌드
npm run build
```

---

## 프로젝트 구조

```
/FlowSpace
├── CLAUDE.md                        # 루트 헌법 (전역 원칙)
│
├── /src
│   ├── /app                         # Next.js App Router
│   │   ├── /spaces                  # 공간 목록, 초대 코드 입장
│   │   ├── /space/[id]              # 개별 공간 페이지
│   │   ├── /admin                   # 운영자 대시보드
│   │   └── /api                     # API 라우트
│   │
│   ├── /components                  # 공통 UI 컴포넌트
│   │   └── /ui                      # shadcn/ui + 커스텀
│   │
│   ├── /features                    # 기능 모듈
│   │   └── /space                   # 공간 기능 (핵심)
│   │       ├── /components          # 공간 전용 컴포넌트
│   │       ├── /game                # Phaser 게임 엔진
│   │       ├── /livekit             # LiveKit 연동
│   │       └── /socket              # Socket.io 연동
│   │
│   └── /lib                         # 유틸리티 & 백엔드
│
├── /server                          # Socket.io 서버
├── /prisma                          # DB 스키마
├── /public/assets/game              # 게임 에셋
└── /docs                            # 문서
    └── prd.md                       # 제품 요구사항 문서
```

---

## UI 레이아웃

```
┌──────────────────────────────────────────────────────────────────┐
│ Header: [Logo] [Space Name] ─────────────────── [User] [Exit]    │
├──────────┬─────────────────────────────────────┬─────────────────┤
│  Chat    │        Game Canvas (Phaser 3)       │  Participants   │
│  Panel   │                                      │     Panel       │
│ (resize) │    ┌─────────────────────────┐      │  ┌──────────┐   │
│          │    │  Character + Map        │      │  │  Video   │   │
│          │    │                         │      │  │  Grid    │   │
│          │    └─────────────────────────┘      │  └──────────┘   │
├──────────┴─────────────────────────────────────┴─────────────────┤
│ Control Bar: [Mic] [Camera] [Screen] [Chat] [Participants] [⚙️]  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 문서

| 문서 | 설명 |
|-----|------|
| `/CLAUDE.md` | 루트 헌법 - 전역 원칙, UI 시스템 규칙 |
| `/docs/prd.md` | 제품 요구사항 문서 |
| `/src/components/claude.md` | UI 컴포넌트 가이드 |
| `/src/features/claude.md` | 기능 모듈 개발 가이드 |
| `/src/lib/claude.md` | 백엔드/유틸 가이드 |

---

## UI 시스템 규칙

### 버튼 Variants

| Variant | 용도 | 사용 빈도 |
|---------|------|----------|
| `default` | Primary 액션 (CTA) | 기본 사용 |
| `outline` | Secondary 액션 | 기본 사용 |
| `destructive` | 위험 액션 | 사용자 요청 시만 |
| `ghost` | 최소 강조 | 사용자 요청 시만 |

### 디자인 토큰

```css
:root {
  --primary: hsl(168 64% 50%);   /* 이 값만 변경 → 브랜드 변경 */
}
```

---

## 라이센스

MIT

---

## 변경 이력

| 날짜 | 버전 | 변경 |
|-----|------|------|
| 2025-12-05 | 1.0.0 | 초기 프로젝트 설정 |
| 2025-12-06 | 2.0.0 | Phaser 3 + Socket.io + LiveKit 기반 자체 개발 전환 |
| 2025-12-07 | 3.0.0 | 멀티플레이어 구현, LiveKit 연동, 문서 구조 정리 |
