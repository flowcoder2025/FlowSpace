# PRD.md — ZEP-감성 2D 메타버스 MVP (자체 개발)

> 이 문서는 **Phaser 3 + Socket.io + LiveKit** 기반으로 "ZEP 감성"의 2D 웹 메타버스 MVP를 구축하기 위한 제품 요구사항(Product Requirements Document)이다.
> 목표는 **가벼운 게임 엔진을 기반**으로 **브랜딩 + 인증 + 운영/분석 + 실시간 협업**까지 결합한 **상용화 가능한 최소 플랫폼**을 만드는 것이다.

---

## 1. 배경(Background)
- 브라우저에서 즉시 접속 가능한 2D 픽셀 기반 가상 공간은 교육/행사/커뮤니티/오피스 형태로 빠르게 확산 중이다.
- ZEP, Gather 등 기존 메타버스 솔루션은 불필요한 기능이 많고 커스터마이징에 한계가 있으며 비용이 높다.
- **자체 개발 접근법**: Phaser 3(2D 렌더링) + Socket.io(실시간 동기화) + LiveKit(음성/영상)를 활용하여 필요한 기능만 구현하는 것이 효율적이다.

---

## 2. 문제 정의(Problem Statement)
- 기존 메타버스 도구는 다음 문제를 갖는다.
  1) 회사/브랜드 맞춤화가 제한적이거나 비용이 크다.
  2) 조직 단위 권한/로그/분석이 약하다.
  3) 행사/온보딩/커뮤니티 운영에 필요한 **운영자 도구**가 부족하다.
  4) “우리만의 플랫폼” 형태로 확장 가능한 기반이 부족하다.

---

## 3. 목표(Goals)
### 3.1 제품 목표
- Phaser 3 + Socket.io + LiveKit 자체 개발로 다음을 만족하는 **ZEP-감성 MVP** 제공
  - 브랜딩된 2D 공간
  - 링크 기반 입장 + 게스트/소셜 로그인
  - 최소한의 조직/공간 권한
  - 운영자 관점의 접속/체류/이벤트 로그
  - 간단한 맵/오브젝트 템플릿 운용

### 3.2 비즈니스 목표
- 초기 고객 타깃 2개 세그먼트에서 PoC 성공
  - **소규모 기업(10~200명)**: 온보딩/가상오피스
  - **교육/행사 운영자**: 강의/세미나/컨퍼런스

### 3.3 기술 목표
- “엔진 변경 최소화, 플랫폼 레이어 최대화”
- 멀티 테넌시(향후) 가능한 데이터 구조
- 셀프호스팅/클라우드 호스팅 모두 고려

---

## 4. 비목표(Non-Goals)
- ZEP 수준의 대규모 동접(수천~수만) 보장
- 완전한 사용자 제작(UGC) 에디터를 MVP에 포함하지 않음
- 3D, VR/AR 지원
- 복잡한 게임화(전투/경제 시스템 등)

---

## 5. 타깃 사용자(Personas)
1) **운영자(Organizer/Admin)**
   - 목표: 행사/교육/사내 이벤트를 빠르게 개설하고 안정적으로 운영
   - 고통: 사용자 입장 관리, 정보 전달, 참여율 측정이 어려움

2) **참가자(Participant/User)**
   - 목표: 별도 설치 없이 빠르게 입장하고 소통
   - 고통: 로그인/입장 절차가 복잡하면 이탈

3) **조직 관리자(Org Owner, 향후)**
   - 목표: 팀/부서별 공간 운영, 권한 분리, 활동 데이터 확인

---

## 6. 핵심 사용자 시나리오(User Stories)
### 6.1 운영자
- 나는 이벤트용 공간을 **템플릿 기반**으로 10분 내 개설하고 싶다.
- 나는 초대 링크를 발급하고, 필요시 **비공개/암호/조직 전용** 등 입장 규칙을 지정하고 싶다.
- 나는 행사 이후 **참가자 수/피크 동시접속/평균 체류 시간**을 보고하고 싶다.

### 6.2 참가자
- 나는 링크만 클릭해서 **게스트로 즉시 입장**하고 싶다.
- 나는 아바타를 선택/변경하고 다른 사용자와 채팅/음성 소통을 하고 싶다.

---

## 7. 제품 범위(Scope)

### 7.1 MVP 기능 목록

#### A. 입장/인증
- 게스트 입장
- 소셜 로그인(최소 1개: Google 권장)
- 닉네임 중복 처리 및 기본 프로필(아바타/색상) 설정

#### B. 공간/이벤트 관리
- “공간(월드)” 생성
- 초대 링크 발급
- 접근 제어(공개/비공개/암호)
- 기본 템플릿 3종
  1) 오피스
  2) 강의실/세미나
  3) 커뮤니티 라운지

#### C. 인터랙션(최소)
- 지정 오브젝트 상호작용
  - 외부 링크 열기
  - 공지 패널 팝업
  - 설문/폼 연결

#### D. 운영자 대시보드(웹)
- 공간별 지표
  - 일/주/월 방문자 수
  - 동시접속 피크
  - 평균 체류 시간
  - 재방문율(가능 시)
- 이벤트 로그 목록
  - 입장/퇴장
  - 특정 오브젝트 상호작용

#### E. 브랜딩
- 로고/테마 컬러/로딩 화면
- 기본 UI 문구 커스터마이징

---

### 7.2 v1 확장 기능(차기)
- 조직(Workspace) 개념 도입
- SSO(SAML/OIDC)
- 맵 템플릿 마켓(사내/파트너용)
- 간단한 웹 기반 “오브젝트 배치형” 미니 에디터
- AI 도우미(Claude) 연동
  - 온보딩 NPC
  - 공간 운영 Q&A
  - 채팅 요약

---

## 8. 기능 요구사항(Functional Requirements)

### 8.1 인증
- FR-Auth-01: 사용자는 링크로 입장 시 **게스트 또는 소셜 로그인**을 선택할 수 있다.
- FR-Auth-02: 게스트는 최소 정보(닉네임)만 요구한다.
- FR-Auth-03: 닉네임 중복 시 자동 suffix 또는 재입력 유도.

### 8.2 공간 생성/관리
- FR-Space-01: 운영자는 대시보드에서 공간을 생성한다.
- FR-Space-02: 공간 생성 시 템플릿을 선택한다.
- FR-Space-03: 생성된 공간은 고유 초대 링크를 가진다.
- FR-Space-04: 공간 접근 정책(공개/비공개/암호)을 설정한다.

### 8.3 템플릿
- FR-Template-01: MVP는 3개 템플릿을 제공한다.
- FR-Template-02: 템플릿은 **맵 파일 + 타일셋 + 기본 오브젝트** 묶음으로 관리한다.

### 8.4 운영자 대시보드
- FR-Admin-01: 운영자는 공간별 지표를 조회한다.
- FR-Admin-02: 운영자는 기간 필터로 통계를 본다.
- FR-Admin-03: 운영자는 이벤트 로그를 CSV로 내보낼 수 있다(선택).

### 8.5 브랜딩
- FR-Brand-01: 서비스 운영자는 로고/컬러/로딩 화면을 설정한다.

---

## 9. 비기능 요구사항(Non-Functional Requirements)
- NFR-01: 브라우저 최신 버전(Chrome/Edge/Safari/Firefox)에서 기본 동작
- NFR-02: 모바일은 “뷰어 수준” 우선 지원(완전 UX 최적화는 차기)
- NFR-03: 평균 지연 체감 최소화
- NFR-04: 로그/통계는 개인정보 최소 수집 원칙 준수
- NFR-05: 인프라 장애 시 기본 복구 절차 문서화

---

## 10. 정보 구조 & 도메인 모델(초안)

### 10.1 핵심 엔티티
- User
- Space
- SpaceAccessPolicy
- EventLog
- Template

### 10.2 예시 스키마(개념)
- users(id, provider, provider_id, nickname, avatar, created_at)
- spaces(id, name, template_id, owner_user_id, access_type, access_secret, created_at)
- templates(id, key, name, version, assets_path)
- event_logs(id, space_id, user_id, event_type, payload_json, created_at)

---

## 11. 기술/아키텍처 제안(구현 가이드)

### 11.1 구성 개요
- **Game Engine**: Phaser 3 (2D 렌더링 + 캐릭터 이동)
- **Real-time Sync**: Socket.io (멀티플레이어 동기화)
- **Video/Voice**: LiveKit (WebRTC 관리형 서비스)
- **Platform Layer**: Next.js + Prisma (인증/권한/공간 관리)
- **Admin Dashboard**: 기존 Next.js 앱 내 /admin 라우트

### 11.2 기술 스택
| 영역 | 기술 | 역할 |
|------|------|------|
| Frontend | Next.js 15 + React 19 + TypeScript | 플랫폼 UI |
| Game Engine | Phaser 3 | 2D 맵 렌더링, 캐릭터 이동 |
| Real-time | Socket.io | 위치/상태 동기화 |
| Video/Voice | LiveKit | 음성/영상 통화 |
| UI Panels | react-resizable-panels | 리사이즈 가능 패널 |
| Drag & Drop | @dnd-kit/core | 드래그 가능 비디오 |
| Database | Supabase PostgreSQL + Prisma | 데이터 저장 |
| Auth | NextAuth.js | 인증/권한 |
| Deploy | Vercel | 호스팅 |

### 11.3 ZEP 스타일 UI 레이아웃

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

### 11.4 컴포넌트 구조

```
/src/features/space/
├── components/
│   ├── SpaceLayout.tsx           # 전체 레이아웃 컨테이너
│   ├── SpaceHeader.tsx           # 상단 헤더
│   ├── sidebar/
│   │   └── ChatPanel.tsx         # 좌측 채팅 (리사이즈/숨김)
│   ├── game/
│   │   ├── GameCanvas.tsx        # Phaser 캔버스 래퍼
│   │   ├── PhaserGame.ts         # Phaser 게임 인스턴스
│   │   └── scenes/
│   │       └── MainScene.ts      # 메인 게임 씬
│   ├── video/
│   │   ├── ParticipantPanel.tsx  # 우측 참가자 비디오 그리드
│   │   ├── VideoTile.tsx         # 개별 비디오 타일
│   │   └── ScreenShare.tsx       # 화면 공유 뷰
│   └── controls/
│       └── ControlBar.tsx        # 하단 컨트롤 바
├── hooks/
│   ├── useSocket.ts              # Socket.io 연결 관리
│   ├── useLiveKit.ts             # LiveKit 연결 관리
│   └── useGameState.ts           # 게임 상태 관리
└── types/
    └── space.types.ts            # 타입 정의
```

---

## 12. 릴리즈 계획(Roadmap)

### Phase 1: 기반 UI ✅ 완료
- [x] 플랫폼 레이어 (인증/공간관리/대시보드)
- [x] ZEP 스타일 레이아웃 구현 (SpaceLayout)
- [x] 리사이즈 가능 패널 (react-resizable-panels)
- [x] 컨트롤 바 (ControlBar)
- [x] 채팅 패널 (ChatPanel)
- [x] 참가자 패널 (ParticipantPanel)
- [x] 헤더 (SpaceHeader)

### Phase 2: 게임 엔진 ✅ 완료
- [x] Phaser 3 설정 및 Next.js 통합
- [x] 기본 맵 타일 렌더링 (TileSystem)
- [x] 캐릭터 스프라이트 및 이동 (CharacterSprite)
- [x] 카메라 추적 (MainScene)
- [x] 상호작용 오브젝트 구조 (InteractiveObject)

### Phase 3: 멀티플레이어 ✅ 완료
- [x] Socket.io 서버 설정 (socket-server.ts)
- [x] 플레이어 위치 동기화
- [x] 입장/퇴장 이벤트
- [x] 채팅 시스템
- [x] 🔒 세션 검증 및 서버 파생 ID (보안 강화)

### Phase 4: 음성/영상 ✅ 완료 (⚠️ 이슈 있음)
- [x] LiveKit 연동 (LiveKitRoomProvider, useLiveKit)
- [x] 참가자 비디오 그리드 (VideoTile)
- [x] 마이크/카메라 토글
- [x] 화면 공유 (ScreenShare)
- ⚠️ **알려진 이슈**: 비디오 기능 일부 문제 → 별도 분석 필요

### Phase 5: 통합 및 Polish 🔄 진행중
- [x] 전체 플로우 통합
- [x] 에러 처리 및 로딩 상태
- [x] **플로팅 채팅 오버레이** (드래그 가능, Enter 토글)
- [x] **귓속말/파티 채팅** 시스템
- [x] **VideoTile 아바타 색상** (CSS hue-rotate)
- [x] **아바타 색상 검증** (Missing Texture 버그 수정)
- [ ] 반응형 디자인 최적화
- [ ] PoC 데모 패키징
- [ ] 템플릿 실제 맵 에셋 (3종)
- [ ] 오브젝트 상호작용 기능 (링크/공지/설문)
- [ ] CSV 내보내기

### Phase 6: 권한 및 구독 시스템 📋 계획
- [ ] 권한 체계 (SUPER_ADMIN → SPACE_OWNER → STAFF → PARTICIPANT)
- [ ] 구독 플랜 관리 (FREE/PRO/PREMIUM)
- [ ] 채팅 관리 (삭제/음소거/강퇴)
- [ ] 관리자 대시보드 확장
- [ ] 가격 페이지

---

## 13. 성공 지표(Success Metrics)

### 제품 지표
- 초대 링크 클릭 대비 실제 입장 전환율
- 평균 체류 시간
- 재방문율(주간)

### 운영 지표
- 템플릿 기반 공간 개설 소요 시간(목표: 10분 이내)
- 운영자 대시보드 사용률

---

## 14. 리스크 & 대응

1) **Phaser 3 + React 통합 복잡성**
   - 대응: React 래퍼 컴포넌트 패턴 사용, useEffect 정리로 메모리 누수 방지

2) **WebRTC 품질 이슈**
   - 대응: LiveKit 관리형 서비스 사용으로 TURN/STUN 복잡성 제거

3) **Socket.io 확장성**
   - 대응: 초기 단일 서버 구성, 필요시 Redis Adapter로 수평 확장

4) **UGC 요구 폭발**
   - 대응: MVP는 템플릿 중심으로 한정, 간단 배치형 에디터는 v1로 분리

5) **개발 복잡도 증가**
   - 대응: 단계별 구현으로 각 레이어 독립 테스트 가능하게 설계

---

## 15. 오픈 이슈(Questions)
- 인증 범위: 게스트만으로 PoC 가능한가, 혹은 소셜 로그인 필수인가?
- 템플릿 제작 범위: 내부 제작 vs 외부 디자이너 협업 방식
- 초기 수익모델: 프로젝트 단위 구축비 vs 월 구독형

---

## 16. 부록 — Claude 활용 지침(요약)

### 16.1 개발 워크플로우
1) PRD → 아키텍처 → API 명세 → 구현 순서 준수
2) 기능 요청은 반드시 **파일 단위/요구사항 단위**로 분할
3) 구현 시 테스트 코드(Jest) 동반

### 16.2 Claude에게 줄 작업 프롬프트 예시
- "Phaser 3 기반 플랫폼 레이어에서 공간 생성 API를 설계해줘.
  엔티티는 Space/Template/EventLog를 사용하고, Postgres 기준 스키마/라우팅/에러 정책까지 포함해줘.”

---

## 17. 요약
- 이 MVP는 **Phaser 3 + Socket.io + LiveKit 기반 자체 개발**로
  **브랜딩 + 인증 + 공간/템플릿 관리 + 운영자 분석 + 실시간 협업**을 제공한다.
- ZEP 스타일 UI 레이아웃: 좌측 채팅, 중앙 게임 캔버스, 우측 참가자 비디오
- 목표는 "ZEP 복제"가 아니라,
  **특정 유즈케이스(오피스/교육/행사)에 최적화된 상용 가능한 최소 플랫폼**이다.

---

> 문서 버전
- v0.1 (2025-12-05): 초안 작성
- v0.2 (2025-12-06): 자체 개발 방향으로 전환 (Phaser 3 + Socket.io + LiveKit)
- v0.3 (2025-12-08): Phase 1-4 완료 상태 반영, Phase 5 진행중 업데이트
- v0.4 (2025-12-11): Phase 5 진행 상황 업데이트 (채팅 시스템, 아바타 색상), Phase 6 추가

