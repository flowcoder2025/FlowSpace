# Changelog

> Feature Batch 완료 시 변경 내용 기록

---

## [2025-12-16] 화면 공유 크롭 문제 해결 문서화

### 문서 업데이트

**`src/features/space/claude.md`**:
- VideoTile 화면 공유 처리 문서화 (3.2절)
  - 화면 공유 시 `object-contain` 적용 (크롭 방지)
  - 본인 화면 공유는 VideoTile에서 렌더링됨 (ScreenShareOverlay는 타인 전용)
- 변경 이력 추가

**`docs/PRD.md`**:
- Phase 4 비디오 이슈 상태 업데이트 (화면 공유 크롭 문제 해결)

---

## [2025-12-15] 멤버 관리 시스템 통합 및 닉네임 검증 강화

### 주요 변경 (792aa60)

**MemberManagement 컴포넌트 통합**:
- `StaffManagement.tsx` 삭제 → `MemberManagement.tsx`로 통합
- OWNER 권한 확장: SuperAdmin + OWNER 모두 OWNER 추가/강등 가능
- dashboard/spaces 페이지 `isSuperAdmin` 동적 전달 수정

**닉네임 띄어쓰기 금지** (귓속말 기능 지원):
- `ParticipantEntryModal`: 입력 시 자동 제거 + 유효성 검사
- `SpaceSettingsModal`: 입력 시 자동 제거 + 유효성 검사
- `/api/guest`: 서버측 닉네임 검증 추가

**API 추가**:
- `/api/spaces/[id]/visit` - 공간 방문 시 자동 PARTICIPANT 등록

**네비게이션 구조 정리**:
- `/dashboard/page.tsx` 삭제 (불필요한 리디렉션 페이지)
- 역할별 접근 제어 강화

---

## [2025-12-12] 역할별 네비게이션 시스템 구현 (Phase 1-5)

### Phase 1: 자동 멤버십 생성 (fe89f9e)
- 공간 생성 시 OWNER 자동 등록
- 게스트/로그인 사용자 입장 시 PARTICIPANT 자동 등록

### Phase 2: SuperAdmin 전용 /admin 접근 (b2508c3)
- `/admin/*` 라우트 SuperAdmin 전용 제한
- 미인증 사용자 리다이렉트 처리

### Phase 3: Owner/Staff용 공간 관리 대시보드 (24d90dd)
- `/dashboard/spaces/[id]` - 공간 상세 관리 페이지
- 통계, 멤버 관리, 설정 통합

### Phase 4: Member용 참여 공간 목록 (373cb32)
- `/my-spaces` - 내가 참여한 공간 목록
- 역할별 필터링 (OWNER/STAFF/PARTICIPANT)

### Phase 5: 역할별 네비게이션 통합 (59c5bc7)
- `UserNav` 컴포넌트 역할 기반 메뉴 표시
- SuperAdmin: 관리자 대시보드 링크
- Owner/Staff: 공간 관리 링크
- 일반 사용자: 내 공간 링크

### 멤버 관리 시스템 구현 (cf0a990)
- `SpaceLayout`에 `isSuperAdmin` prop 추가
- `MemberList`, `MemberSearchInput`, `RoleBadge` 공용 컴포넌트
- OWNER/STAFF 임명/해제 기능
- 온라인/오프라인 상태 표시

### 8가지 버그 수정 (86e1acd)
- `chatFilter`: all 탭에서 링크 포함 메시지도 표시
- `admin/logs`: 로그 뷰어 UI 개선 및 타입 에러 수정
- `admin/spaces`: 공간 설정 저장 시 불필요한 fetch 제거
- `spaces/api`: 예외 처리 개선 (isOrganizer 누락 방지)
- `socket-server`: whisper 메시지 타입 불일치 수정
- `ParticipantPanel`: 그리드 드롭다운 클릭 이벤트 수정
- `feat(chat)`: 글씨 크기 조절 기능 추가 (A-/A+ 버튼)

---

## [2025-12-11] Phase 6 DB 스키마 확장 구현

### 데이터베이스 변경

**`prisma/schema.prisma`**:
- 새 Enum 타입 추가: SpaceRole, ChatRestriction, SenderType, MessageType
- SpaceEventType 확장: MEMBER_MUTED, MEMBER_UNMUTED, MEMBER_KICKED, MESSAGE_DELETED, STAFF_ASSIGNED, STAFF_REMOVED
- SpaceMember 모델 추가 (공간 멤버십 + 역할 + 제재 상태)
- ChatMessage 모델 추가 (채팅 메시지 영속화)
- User 모델 확장: isSuperAdmin 필드, spaceMemberships 관계
- Space 모델 확장: members, chatMessages 관계
- GuestSession 모델 확장: spaceMemberships 관계

### 검증

- ✅ `prisma db push` 성공
- ✅ `npx tsc --noEmit` 에러 없음
- ✅ `npm run build` 성공 (23 페이지 생성)

---

## [2025-12-11] Phase 6 권한/구독 시스템 스펙 문서 작성

### 문서 추가

**`docs/architecture/phase6-permissions-spec.md`** (신규):
- 역할 계층 구조: SUPER_ADMIN → SPACE_OWNER → STAFF → PARTICIPANT
- 구독 티어 정의: FREE/PRO/PREMIUM (가격, 제한 사항)
- DB 스키마 확장: SpaceMember, ChatMessage 테이블
- API 설계: 권한 관리, 채팅 관리, 구독 관리
- Socket.io 관리 이벤트 정의
- UI 컴포넌트 설계
- 구현 우선순위 및 일정

### CLAUDE.md 업데이트

**`server/claude.md`**:
- whisper/party 이벤트 추가 (귓속말/파티 채팅)

**`src/features/claude.md`**:
- 채팅 시스템 디렉토리 구조 업데이트 (/chat 폴더)
- FloatingChatOverlay, ChatTabs 컴포넌트 문서화

---

## [2025-12-11] 문서 현행화 및 Phase 6 계획 추가

### 문서 업데이트

**`docs/architecture/flowspace.md`**:
- 채팅 시스템 아키텍처 추가 (Floating Overlay, 귓속말/파티)
- VideoTile 아바타 색상 시스템 문서화
- Socket.io 이벤트 상세화 (whisper, party 이벤트)

**`docs/PRD.md`**:
- Phase 5 진행 상황 업데이트 (완료 항목 4개 추가)
- Phase 6 권한/구독 시스템 계획 추가

**업데이트 목적**:
- 권한/구독/채팅관리 시스템 구현 전 문서 현행화
- SaaS 모델 반영 (SUPER_ADMIN → SPACE_OWNER → STAFF → PARTICIPANT)

---

## [2025-12-10] 플로팅 채팅 오버레이 및 귓속말/파티 시스템

### 추가

**채팅 UI 개편**:
- `FloatingChatOverlay.tsx` - 게임 캔버스 위 드래그 가능 채팅창
- `ChatTabs.tsx` - 전체/귓속말/파티 탭 전환
- `ChatMessageList.tsx` - 스크롤, 자동스크롤, 방향키 네비게이션
- `ChatInputArea.tsx` - Enter 전송, ESC 취소

**채팅 관련 훅**:
- `useChatMode.ts` - ACTIVE/INACTIVE 모드 토글
- `useChatDrag.ts` - 드래그 위치, localStorage 저장
- `useChatStorage.ts` - 메시지 영속성

**귓속말/파티 시스템**:
- `whisper:send/received` - 1:1 귓속말
- `party:create/invite/accept/decline/leave/message` - 파티 채팅
- Socket 서버 파티 상태 관리

**VideoTile 개선**:
- CSS `hue-rotate` 로 아바타 색상 표시
- 참가자 패널 투명 배경

---

## [2025-12-09] 캐릭터 스프라이트 Missing Texture 버그 수정

### 수정

**근본 원인 해결**:
- Google 로그인 사용자의 `avatarColor`가 프로필 이미지 URL로 설정되는 버그 수정
- Phaser에서 `character-https://...` 텍스처 키를 찾지 못해 "Missing Texture" 발생

**변경 파일**:
- `/src/app/space/[id]/page.tsx`
  - 아바타 색상 유효성 검사 헬퍼 함수 추가 (`isValidAvatarColor`, `getSafeAvatarColor`)
  - `VALID_AVATAR_COLORS` 상수 정의 (`socket/types.ts`의 `AvatarColor`와 일치)
  - 로그인 사용자 및 게스트 세션 모두에 색상 검증 적용

**패턴**:
```tsx
const VALID_AVATAR_COLORS = ["default", "red", "green", "purple", "orange", "pink"] as const

function getSafeAvatarColor(value: unknown): LocalAvatarColor {
  return isValidAvatarColor(value) ? value : "default"
}
```

---

## [2025-12-08] PRD 재정립 및 문서 구조 개선

### 변경

**PRD.md 업데이트**:
- Phase 1-4 완료 상태 반영
- Phase 5 진행중 항목 정리
- Phase 4 비디오 이슈 표시 추가
- 버전 v0.3 업데이트

**신규 claude.md 추가**:
- `/src/features/space/claude.md` - 핵심 Space 모듈 가이드
- `/server/claude.md` - Socket.io 서버 가이드

**CLAUDE.md 계층구조 확장**:
- Space 모듈 claude.md 연결 추가
- Server claude.md 연결 추가
- 작업 유형별 필수 참조 테이블 업데이트

**docs/ 폴더 재정립**:
- `README.md` - FlowSpace 프로젝트 컨텍스트 추가
- `architecture/flowspace.md` - FlowSpace 아키텍처 문서 신규 생성
- 로드맵 현황 추가 (Phase 완료 상태)

### 분석 결과

**구현 완료 (Phase 1-4)**:
- 기반 UI: SpaceLayout, 리사이즈 패널, 컨트롤바
- 게임 엔진: Phaser 3, 타일맵, 캐릭터 스프라이트
- 멀티플레이어: Socket.io, 위치 동기화, 채팅, 세션 검증
- 음성/영상: LiveKit 연동, VideoTile, ScreenShare

**진행중 (Phase 5)**:
- 반응형 디자인 최적화
- 템플릿 맵 에셋 (3종)
- 오브젝트 상호작용 기능
- CSV 내보내기

**알려진 이슈**:
- 비디오 기능 일부 문제 (분석 예정)

---

## [2025-12-05] Initial Setup

### 추가
- foundations/: naming, tokens, i18n, accessibility, semantic
- components/: button, modal, form, icon, _template
- checklists/: button, modal, a11y
- architecture/: ui-system-overview
- workflow/: new-component

### 규칙
- 토큰 효율 원칙 적용 (자동 문서 생성 금지)
- 응답 형식: 설계 요약 → 코드
- 문서는 사용자 요청 시만 업데이트
