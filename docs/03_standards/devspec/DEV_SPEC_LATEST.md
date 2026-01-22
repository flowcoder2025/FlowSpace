# 개발 사양서 (DEV_SPEC)

> 자동 생성: specctl compile (2026-01-22 15:28:43)

---

## 목차
- [ADMIN](#ADMIN)
- [AI_PROTOCOL](#AI_PROTOCOL)
- [ARCH](#ARCH)
- [AUTH](#AUTH)
- [CRON](#CRON)
- [DASHBOARD](#DASHBOARD)
- [DOCOPS](#DOCOPS)
- [FOUNDATION](#FOUNDATION)
- [GAME](#GAME)
- [GUEST](#GUEST)
- [INFRA](#INFRA)
- [LIVEKIT](#LIVEKIT)
- [PAGE](#PAGE)
- [PERMISSION](#PERMISSION)
- [SOCKET](#SOCKET)
- [SPACE](#SPACE)
- [UI_COMPONENT](#UI_COMPONENT)
- [UI_SYSTEM](#UI_SYSTEM)
- [USER](#USER)

---

## ADMIN

### Contract: ADMIN_API_SPACES

- **What**: 전체 공간 목록 조회 API (SuperAdmin 전용)
- **Evidence**:
  - code: `src/app/api/admin/spaces/route.ts::GET`
  - code: `src/lib/space-auth.ts::isSuperAdmin`

### Contract: ADMIN_API_LOGS

- **What**: 플랫폼 이벤트 로그 조회 API
- **Evidence**:
  - code: `src/app/api/admin/logs/route.ts::GET`
  - code: `prisma/schema.prisma::SpaceEventLog`

### Contract: ADMIN_API_STATS

- **What**: 플랫폼 통계 API
- **Evidence**:
  - code: `src/app/api/admin/stats/route.ts::GET`

### Contract: ADMIN_API_USAGE_ANALYSIS

- **What**: 사용량 분석 API
- **Evidence**:
  - code: `src/app/api/admin/usage/analysis/route.ts::GET`

### Contract: ADMIN_API_USAGE_RESET

- **What**: 사용량 데이터 초기화 API
- **Evidence**:
  - code: `src/app/api/admin/usage/reset/route.ts::POST`

### Contract: ADMIN_API_USAGE_DEBUG

- **What**: 사용량 디버그 API
- **Evidence**:
  - code: `src/app/api/admin/usage/debug/route.ts::GET`

### Contract: ADMIN_API_OCI_METRICS

- **What**: Oracle Cloud 메트릭 조회 API
- **Evidence**:
  - code: `src/app/api/admin/oci-metrics/route.ts::GET`

---

## AI_PROTOCOL

### Contract: AI_PROTOCOL_FUNC_SESSION_START
- **Tier**: core
- **What**: 작업 시작 전 계층 구조 확인 프로토콜
- **Inputs/Outputs**:
  - Input: 사용자 작업 요청
  - Output: 컨텍스트 로드 완료 상태
- **Flow**:
  ```
  작업 요청 수신
      ↓
  1. /CLAUDE.md 확인 (루트 헌법)
      ↓
  2. 작업 영역 claude.md 확인
      ↓
  3. /docs 관련 문서 확인
      ↓
  4. /TASK.md 확인 (미완료 항목)
      ↓
  작업 시작
  ```
- **Evidence**:
  - code: `CLAUDE.md`
  - code: `docs/00_ssot/ANCHOR.md`

### Contract: AI_PROTOCOL_FUNC_TASK_MANAGEMENT
- **Tier**: core
- **What**: TASK.md 실시간 관리 프로토콜
- **Inputs/Outputs**:
  - Input: 태스크 상태 변경 이벤트
  - Output: TASK.md 업데이트
- **Rules**:
  | 상황 | 절차 |
  |-----|------|
  | 이전 TASK 완료됨 | 피드백 받기 → 반영 → 초기화 |
  | 이전 TASK 미완료 | 미완료 파악 → 보고 → 진행 |
  | 새 태스크 시작 | 계획 작성 → 실시간 업데이트 |
- **생성 조건**:
  | 상황 | TASK.md 필요 |
  |-----|:------------:|
  | 단순 버그 수정 | ❌ |
  | 단일 파일 수정 | ❌ |
  | 3개+ 파일 수정 | ⚠️ 권장 |
  | 새 기능 추가 | ✅ 필수 |
  | 복잡한 리팩토링 | ✅ 필수 |
- **Evidence**:
  - code: `TASK.md::TASK`

### Contract: AI_PROTOCOL_FUNC_CODE_DOC_SYNC
- **Tier**: normal
- **What**: 코드 변경 시 문서 업데이트 연동
- **Rules**:
  | 코드 변경 유형 | 문서 업데이트 대상 |
  |--------------|------------------|
  | 새 API 추가 | 해당 SPEC.md, claude.md |
  | 기능 완료 | ROADMAP.md 상태 |
  | 버그 수정 | TASK.md |
  | 아키텍처 변경 | ARCH.md |
- **Evidence**:
  - code: `docs/00_ssot/DOC_POLICY.md`

### Contract: AI_PROTOCOL_FUNC_VERIFICATION
- **Tier**: core
- **What**: 구현 완료 후 검증 프로세스
- **Flow**:
  ```
  구현 완료
      ↓
  1. npx tsc --noEmit (타입체크)
      ↓
  2. npm run build (빌드)
      ↓
  3. 관련 문서 업데이트
      ↓
  4. git commit & push
      ↓
  완료 보고
  ```
- **Errors**:
  - `TYPE_ERROR`: 타입 에러 → 코드 수정 후 재검증
  - `BUILD_ERROR`: 빌드 에러 → 원인 파악 → 수정
  - `UNRESOLVED`: 해결 불가 → 사용자 보고
- **Evidence**:
  - code: `package.json`

---

## ARCH

### Contract: ARCH_FUNC_NEXTJS_PLATFORM

- **What**: Next.js 15 App Router 기반 플랫폼 레이어 (인증, API, 대시보드)
- **Evidence**:
  - code: `src/app/layout.tsx::RootLayout`
  - code: `src/lib/auth.ts::auth`
  - code: `src/lib/prisma.ts::prisma`

### Contract: ARCH_FUNC_PHASER_GAME

- **What**: Phaser 3 게임 엔진 통합 (2D 맵 렌더링, 캐릭터 이동)
- **Evidence**:
  - code: `src/features/space/game/PhaserGame.tsx::PhaserGame`
  - code: `src/features/space/game/scenes/MainScene.ts::MainScene`

### Contract: ARCH_FUNC_SOCKET_REALTIME

- **What**: Socket.io 실시간 동기화 (위치, 채팅, 세션)
- **Evidence**:
  - code: `server/socket-server.ts::io`
  - code: `src/features/space/socket/useSocket.ts::useSocket`

### Contract: ARCH_FUNC_LIVEKIT_MEDIA

- **What**: LiveKit WebRTC 음성/영상 통화
- **Evidence**:
  - code: `src/features/space/livekit/LiveKitRoomProvider.tsx::LiveKitRoomProvider`
  - code: `src/features/space/livekit/LiveKitMediaContext.tsx::LiveKitMediaInternalProvider`

### Contract: ARCH_FUNC_PRISMA_DB

- **What**: Prisma ORM 데이터베이스 관리
- **Evidence**:
  - code: `prisma/schema.prisma::User`
  - code: `prisma/schema.prisma::Space`
  - code: `src/lib/prisma.ts::prisma`

---

## AUTH

### Contract: AUTH_API_NEXTAUTH

- **What**: NextAuth.js OAuth 인증 엔드포인트 (Google, GitHub)
- **Evidence**:
  - code: `src/app/api/auth/[...nextauth]/route.ts::GET`
  - code: `src/app/api/auth/[...nextauth]/route.ts::POST`
  - code: `src/lib/auth.ts::auth`

### Contract: AUTH_API_REGISTER

- **What**: 이메일/비밀번호 회원가입 API
- **Evidence**:
  - code: `src/app/api/auth/register/route.ts::POST`
  - code: `src/app/api/auth/register/route.ts::validateEmail`
  - code: `src/app/api/auth/register/route.ts::validatePassword`

### Contract: AUTH_API_USER_CONSENT

- **What**: 사용자 동의(녹화 등) 관리 API
- **Evidence**:
  - code: `src/app/api/user/consent/route.ts::POST`
  - code: `prisma/schema.prisma`

---

## CRON

### Contract: CRON_API_CLEANUP_MESSAGES

- **What**: 오래된 채팅 메시지 정리 크론
- **Evidence**:
  - code: `src/app/api/cron/cleanup-messages/route.ts::GET`
  - code: `prisma/schema.prisma::ChatMessage`

### Contract: CRON_API_CLEANUP_SESSIONS

- **What**: 만료된 게스트 세션 정리 크론
- **Evidence**:
  - code: `src/app/api/cron/cleanup-sessions/route.ts::GET`
  - code: `prisma/schema.prisma::GuestSession`

### Contract: CRON_API_COLLECT_METRICS

- **What**: OCI 메트릭 수집 크론
- **Evidence**:
  - code: `src/app/api/cron/collect-metrics/route.ts::GET`

### Contract: CRON_API_AGGREGATE_USAGE

- **What**: 사용량 집계 크론
- **Evidence**:
  - code: `src/app/api/cron/aggregate-usage/route.ts::GET`

---

## DASHBOARD

### Contract: DASHBOARD_API_STATS

- **What**: 공간별 통계 조회 API
- **Evidence**:
  - code: `src/app/api/dashboard/spaces/[id]/stats/route.ts::GET`
  - code: `src/lib/space-auth.ts::canManageSpace`

### Contract: DASHBOARD_API_EXPORT

- **What**: 공간 데이터 내보내기 API
- **Evidence**:
  - code: `src/app/api/dashboard/spaces/[id]/export/route.ts::GET`
  - code: `src/lib/space-permissions.ts::hasPermission`

---

## DOCOPS

### Contract: DOCOPS_FUNC_SNAPSHOT

> 코드 인벤토리 자동 추출

**Evidence**
- code: `scripts/specctl.ps1::Cmd-Snapshot`

**스캔 대상**

| 디렉토리 | 패턴 | SPEC_KEY |
|----------|------|----------|
| `src/app/**/page.tsx` | App Router 페이지 | PAGE |
| `src/app/api/**/route.ts` | App Router API | * (라우트 기반) |
| `src/components/ui/*.tsx` | UI 컴포넌트 | UI_COMPONENT |
| `src/components/space/*.tsx` | Space 컴포넌트 | UI_COMPONENT |
| `src/features/*/hooks/*.ts` | Feature 훅 | SPACE |
| `src/lib/space-*.ts` | 권한 유틸리티 | SPACE |
| `src/lib/text-config.ts` | 설계 토큰 | FOUNDATION |
| `server/socket-server.ts` | Socket 이벤트 | SOCKET |
| `src/app/globals.css` | CSS 변수 (v0.5.0) | FOUNDATION |

### Contract: DOCOPS_FUNC_VERIFY

> 문서-코드 동기화 검증

**Evidence**
- code: `scripts/specctl.ps1::Cmd-Verify`

**상태 정의**

| 상태 | Snapshot | Contract | Evidence | 설명 |
|------|:--------:|:--------:|:--------:|------|
| SYNC | O | O | O | 완전 동기화 |
| MISSING_DOC | O | X | - | 문서 누락 |
| HALLUCINATION | X | O | - | 코드 없이 문서만 존재 |
| BROKEN_EVIDENCE | O | O | X | Evidence 링크 깨짐 |
| SNAPSHOT_GAP | - | O | O | 자동화 범위 밖 |
| PROCESS_BASED | - | O | - | 프로세스 기반 (v0.5.0) |
| INFRA_BASED | - | O | - | 인프라 기반 (v0.5.0) |

### Contract: DOCOPS_FUNC_COVERAGE_MATRIX

> 커버리지 매트릭스 생성

**Evidence**
- code: `scripts/specctl.ps1::Update-CoverageMatrix`

**출력 형식 (v0.5.0)**

```markdown
## 요약

| 항목 | 값 |
|------|-----|
| **SYNC** | 110 |
| **SNAPSHOT_GAP** | 4 |
| **PROCESS_BASED** | 5 |
| **INFRA_BASED** | 6 |
| **BROKEN_EVIDENCE** | 1 |
| **MISSING_DOC** | 0 |
| **HALLUCINATION** | 0 |
```

---

## FOUNDATION

### Contract: FOUNDATION_FUNC_DESIGN_TOKENS

- **What**: CSS 변수 기반 디자인 토큰 시스템
- **Evidence**:
  - code: `src/app/globals.css::--color-primary`
  - code: `src/app/globals.css::--color-background`
  - code: `src/app/globals.css::--radius`

### Contract: FOUNDATION_FUNC_ACCESSIBILITY

- **What**: WCAG 2.1 Level AA 접근성 규칙
- **Evidence**:
  - code: `src/components/ui/button.tsx::buttonVariants`
  - code: `src/components/ui/dialog.tsx::DialogContent`

### Contract: FOUNDATION_FUNC_I18N

- **What**: 다국어 텍스트 관리 시스템
- **Evidence**:
  - code: `src/lib/text-config.ts::BUTTON_TEXT`
  - code: `src/lib/text-config.ts::STATUS_TEXT`
  - code: `src/lib/text-config.ts::MESSAGE_TEXT`

### Contract: FOUNDATION_FUNC_NAMING

- **What**: ID 네이밍 체계 ({TYPE}.{DOMAIN}.{CONTEXT})
- **Evidence**:
  - code: `src/lib/text-config.ts::DEPLOYMENT_ENV`
  - code: `src/lib/text-config.ts::LABEL_TEXT`

---

## GAME

### Contract: GAME_FUNC_PHASER_WRAPPER

- **What**: PhaserGame React 래퍼
- **Rules**:
  - `useEffect` 클린업에서 `game.destroy()` 필수
  - React Strict Mode 대응 (이중 마운트 처리)
  - Phaser 인스턴스를 React 컴포넌트로 래핑
- **Evidence**:
  - code: `src/features/space/game/PhaserGame.tsx`
  - code: `src/features/space/game/config.ts`

### Contract: GAME_FUNC_MAIN_SCENE

- **What**: MainScene (타일맵, 캐릭터, 카메라)
- **Rules**:
  - 타일맵 로드 및 렌더링
  - 캐릭터 생성 및 이동
  - 카메라 추적
  - 상호작용 오브젝트 관리
- **Evidence**:
  - code: `src/features/space/game/scenes/MainScene.ts`

### Contract: GAME_FUNC_EVENT_BRIDGE

- **What**: Phaser ↔ React 이벤트 브릿지
- **Rules**:
  ```typescript
  // React → Phaser 이벤트 전달
  eventBridge.emit(GameEvents.PLAYER_MOVE, position)

  // React에서 게임 이벤트 수신
  eventBridge.on(GameEvents.PLAYER_MOVED, callback)

  // 채팅 포커스 이벤트
  eventBridge.emit(CHAT_FOCUS_CHANGED, isFocused)
  ```
- **Evidence**:
  - code: `src/features/space/game/events.ts`

### Contract: GAME_FUNC_CHARACTER

- **What**: CharacterSprite 캐릭터 스프라이트
- **Rules**:
  - 아바타 색상별 텍스처 (`character-{color}`)
  - 이동 애니메이션
  - 충돌 처리
- **Evidence**:
  - code: `src/features/space/game/sprites/CharacterSprite.ts`

### Contract: GAME_FUNC_TILES

- **What**: TileSystem 타일맵 렌더링
- **Rules**:
  - Tiled 맵 에디터 JSON 호환
  - 레이어별 렌더링
  - 충돌 레이어 처리
- **Evidence**:
  - code: `src/features/space/game/tiles/TileSystem.ts`

### Contract: GAME_FUNC_OBJECTS

- **What**: InteractiveObject 상호작용 오브젝트
- **Rules**:
  - E 키로 상호작용
  - 오브젝트 타입별 동작 정의
  - 근접 감지
- **Evidence**:
  - code: `src/features/space/game/objects/InteractiveObject.ts`

---

## GUEST

### Contract: GUEST_API_CREATE

- **What**: 게스트 세션 생성 API (입장)
- **Evidence**:
  - code: `src/app/api/guest/route.ts::POST`
  - code: `src/app/api/guest/route.ts::generateSecureRandomSuffix`
  - code: `prisma/schema.prisma::GuestSession`

### Contract: GUEST_API_VERIFY

- **What**: 게스트 세션 검증 API
- **Evidence**:
  - code: `src/app/api/guest/verify/route.ts::POST`

### Contract: GUEST_API_EVENT

- **What**: 게스트 이벤트 기록 API
- **Evidence**:
  - code: `src/app/api/guest/event/route.ts::POST`
  - code: `prisma/schema.prisma::SpaceEventLog`

### Contract: GUEST_API_EXIT

- **What**: 게스트 세션 종료 API (퇴장)
- **Evidence**:
  - code: `src/app/api/guest/exit/route.ts::POST`

---

## INFRA

### Contract: INFRA_FUNC_VERCEL_DEPLOY

- **What**: Vercel 프로덕션 배포 (Next.js 앱)
- **Evidence**:
  - code: `vercel.json`
  - code: `.env.production`

### Contract: INFRA_FUNC_OCI_SERVER

- **What**: Oracle Cloud 통합 서버 (Socket.io + LiveKit)
- **Evidence**:
  - code: `terraform/flowspace-stack/main.tf`
  - code: `terraform/flowspace-stack/cloud-init.yaml`

### Contract: INFRA_FUNC_SOCKET_SERVER

- **What**: Socket.io 실시간 서버 배포
- **Evidence**:
  - code: `server/socket-server.ts::io`
  - code: `server/package.json`

### Contract: INFRA_FUNC_LIVEKIT_SELFHOST

- **What**: LiveKit 자체 호스팅 설정
- **Evidence**:
  - code: `terraform/flowspace-stack/cloud-init.yaml`
  - code: `.env.production`

### Contract: INFRA_FUNC_SSL_CADDY

- **What**: Caddy 리버스 프록시 및 SSL 자동화
- **Evidence**:
  - code: `terraform/flowspace-stack/caddy/Caddyfile`

### Contract: INFRA_FUNC_OCI_MONITORING

- **What**: OCI 리소스 모니터링 API
- **Rules**:
  | 메트릭 | 데이터 소스 | 용도 |
  |--------|------------|------|
  | CPU | OCI Monitoring API | 실시간 사용률 |
  | 메모리 | OCI Monitoring API | 실시간 사용률 |
  | 트래픽 | OCI Monitoring API | 월 누적 + 예측 |
  | 스토리지 할당량 | Block Volume API | Boot Volume 크기 |
  | 스토리지 사용량 | Socket 서버 df | 실제 사용량 |
- **Evidence**:
  - code: `src/app/api/admin/oci-metrics/route.ts::GET`
  - code: `src/lib/utils/oci-monitoring.ts::getOCIInstanceMetrics`

### Contract: INFRA_FUNC_OCI_COST

- **What**: OCI 비용 추정 및 무료 한도 관리
- **Rules**:
  - Always Free 한도: 4 OCPU, 24GB RAM, 200GB Storage, 10TB/월 트래픽
  - 1공간 50명×9시간 = 무료 범위
  - 트래픽 초과 시 과금 발생
- **Evidence**:
  - code: `src/lib/utils/oci-cost.ts::calculateCostEstimate`

### Contract: INFRA_FUNC_METRICS_CRON

- **What**: 메트릭 수집 크론 작업
- **Evidence**:
  - code: `src/app/api/cron/collect-metrics/route.ts::POST`

---

## LIVEKIT

### Contract: LIVEKIT_API_TOKEN

- **What**: LiveKit 룸 토큰 발급 API
- **Evidence**:
  - code: `src/app/api/livekit/token/route.ts::POST`
  - code: `src/app/api/livekit/token/route.ts::removeDuplicateParticipants`
  - code: `src/app/api/livekit/token/route.ts::AccessToken`

### Contract: LIVEKIT_API_WEBHOOK

- **What**: LiveKit 웹훅 처리 API
- **Evidence**:
  - code: `src/app/api/livekit/webhook/route.ts::POST`

### Contract: LIVEKIT_COMP_PROVIDER

- **What**: LiveKitRoomProvider 토큰 페칭 + 컨텍스트
- **Evidence**:
  - code: `src/features/space/livekit/LiveKitRoomProvider.tsx`
  - code: `src/features/space/livekit/LiveKitMediaContext.tsx`

### Contract: LIVEKIT_HOOK_MEDIA

- **What**: useLiveKitMedia 컨텍스트 기반 미디어 제어
- **Evidence**:
  - code: `src/features/space/livekit/useLiveKitMedia.ts`
  - code: `src/features/space/livekit/useLiveKit.ts`

### Contract: LIVEKIT_HOOK_AUDIO

- **What**: useAudioSettings 오디오 설정 관리
- **Rules**:
  | 옵션 | 기본값 | LiveKit 옵션 |
  |-----|-------|--------------|
  | noiseSuppression | true | AudioCaptureOptions.noiseSuppression |
  | echoCancellation | true | AudioCaptureOptions.echoCancellation |
  | autoGainControl | true | AudioCaptureOptions.autoGainControl |
  | voiceIsolation | false | 실험적 기능 |
- **Evidence**:
  - code: `src/features/space/hooks/useAudioSettings.ts`

### Contract: LIVEKIT_HOOK_VIDEO

- **What**: useVideoSettings 비디오 설정 관리
- **Rules**:
  | 프리셋 | 해상도 | 용도 |
  |-------|-------|------|
  | 480p | 640x480 | 저대역폭 |
  | 720p | 1280x720 | 기본 (권장) |
  | 1080p | 1920x1080 | 고화질 |
- **Evidence**:
  - code: `src/features/space/hooks/useVideoSettings.ts`

### Contract: LIVEKIT_HOOK_VOLUME

- **What**: useVolumeMeter Web Audio API 실시간 볼륨 측정
- **Evidence**:
  - code: `src/features/space/hooks/useVolumeMeter.ts`

### Contract: LIVEKIT_HOOK_DEVICES

- **What**: useMediaDevices 미디어 장치 관리
- **Rules**:
  - Option C: 지연된 권한 요청 (iOS Safari 호환)
  - 마운트 시 getUserMedia 호출 안함
  - 설정 열 때 requestPermission() 호출
- **Evidence**:
  - code: `src/features/space/hooks/useMediaDevices.ts`

---

## PAGE

### Contract: PAGE_HOME

- **What**: 랜딩 페이지 - 서비스 소개 및 시작점
- **Evidence**:
  - ui: `src/app/page.tsx::LandingPage`

### Contract: PAGE_ADMIN_DASHBOARD

- **What**: 관리자 대시보드 - 플랫폼 전체 통계 및 모니터링 (SuperAdmin 전용)
- **Evidence**:
  - ui: `src/app/admin/page.tsx::AdminDashboardPage`

### Contract: PAGE_ADMIN_LOGS

- **What**: 관리자 로그 페이지 - 플랫폼 이벤트 로그 조회 (SuperAdmin 전용)
- **Evidence**:
  - ui: `src/app/admin/logs/page.tsx::AdminLogsPage`

### Contract: PAGE_ADMIN_SPACES

- **What**: 관리자 공간 목록 - 전체 공간 관리 (SuperAdmin 전용)
- **Evidence**:
  - ui: `src/app/admin/spaces/page.tsx::AdminSpacesPage`

### Contract: PAGE_ADMIN_SPACE_DETAIL

- **What**: 관리자 공간 상세 - 개별 공간 설정 및 멤버 관리 (SuperAdmin 전용)
- **Evidence**:
  - ui: `src/app/admin/spaces/[id]/page.tsx::SpaceManagePage`

### Contract: PAGE_SPACE_MAIN

- **What**: 공간 메인 페이지 - Phaser 게임 + 실시간 협업 (참여자 입장)
- **Evidence**:
  - ui: `src/app/space/[id]/page.tsx::SpacePage`

### Contract: PAGE_MY_SPACES

- **What**: 내 공간 목록 - 사용자가 참여 중인 공간 관리
- **Evidence**:
  - ui: `src/app/my-spaces/page.tsx::MySpacesPage`

### Contract: PAGE_PROFILE

- **What**: 프로필 페이지 - 사용자 정보 및 참여 공간 확인
- **Evidence**:
  - ui: `src/app/profile/page.tsx::ProfilePage`

### Contract: PAGE_ONBOARDING

- **What**: 온보딩 페이지 - 신규 사용자 초기 설정
- **Evidence**:
  - ui: `src/app/onboarding/page.tsx::OnboardingPage`

### Contract: PAGE_PRICING

- **What**: 요금제 페이지 - FREE/PRO/PREMIUM 플랜 안내
- **Evidence**:
  - ui: `src/app/pricing/page.tsx::PricingPage`

### Contract: PAGE_SPACE_CREATE

- **What**: 공간 생성 페이지 - 새 공간 만들기 (SuperAdmin/유료 구독자)
- **Evidence**:
  - ui: `src/app/spaces/new/page.tsx::CreateSpacePage`

### Contract: PAGE_SPACE_INVITE

- **What**: 공간 초대 페이지 - 초대 코드로 공간 참여
- **Evidence**:
  - ui: `src/app/spaces/[inviteCode]/page.tsx::SpaceEntryPage`

### Contract: PAGE_GAME_TEST

- **What**: 게임 테스트 페이지 - Phaser 게임 개발용 테스트 환경
- **Evidence**:
  - ui: `src/app/game-test/page.tsx::GameTestPage`

### Contract: PAGE_DASHBOARD_SPACE

- **What**: 대시보드 공간 관리 - 공간 소유자용 설정 페이지
- **Evidence**:
  - ui: `src/app/dashboard/spaces/[id]/page.tsx::DashboardSpaceManagePage`

### Contract: PAGE_LOGIN

- **What**: 로그인 페이지 - OAuth 및 Credentials 로그인
- **Evidence**:
  - ui: `src/app/login/page.tsx::LoginPage`

---

## PERMISSION

### Contract: PERMISSION_FUNC_SPACE_ROLE

- **What**: 공간 내 역할 관리 (OWNER, STAFF, PARTICIPANT)
- **Evidence**:
  - code: `src/lib/space-permissions.ts::hasPermission`
  - code: `src/lib/space-permissions.ts::canManage`
  - code: `src/lib/space-permissions.ts::hasMinRole`
  - code: `src/lib/space-permissions.ts::ROLE_HIERARCHY`

### Contract: PERMISSION_FUNC_SPACE_AUTH

- **What**: 공간 권한 검증 미들웨어
- **Evidence**:
  - code: `src/lib/space-auth.ts::isSuperAdmin`
  - code: `src/lib/space-auth.ts::canCreateSpace`
  - code: `src/lib/space-auth.ts::SpaceMemberInfo`

### Contract: PERMISSION_FUNC_CHAT_MANAGE

- **What**: 채팅 관리 기능 (삭제, 음소거, 강퇴)
- **Evidence**:
  - code: `src/features/space/socket/useSocket.ts::sendMuteCommand`
  - code: `src/features/space/socket/useSocket.ts::sendKickCommand`
  - code: `src/features/space/socket/useSocket.ts::deleteMessage`

### Contract: PERMISSION_FUNC_SUBSCRIPTION

- **What**: 구독 플랜 관리 (FREE, PRO, PREMIUM)
- **Evidence**:
  - code: `prisma/schema.prisma::SubscriptionTier`
  - code: `prisma/schema.prisma::Subscription`
  - code: `src/lib/space-auth.ts::canCreateSpace`

---

## SOCKET

### Contract: SOCKET_FUNC_EVENTS

- **What**: Socket.io 이벤트 정의 (32개)
- **Rules**:
  | 방향 | 이벤트 | 페이로드 | 설명 |
  |------|--------|----------|------|
  | C→S | `join:space` | `{ spaceId, playerId, nickname, avatarColor, sessionToken }` | 공간 입장 |
  | C→S | `leave:space` | - | 공간 퇴장 + EXIT 로깅 |
  | C→S | `player:move` | `PlayerPosition` | 위치 업데이트 |
  | C→S | `player:jump` | `PlayerJumpData` | 점프 이벤트 |
  | C→S | `chat:message` | `{ content, type? }` | 채팅 전송 |
  | C→S | `whisper:send` | `{ targetId, content }` | 귓속말 전송 |
  | C→S | `party:create` | `{ name }` | 파티 생성 |
  | C→S | `party:invite` | `{ partyId, targetId }` | 파티 초대 |
  | C→S | `party:accept` | `{ partyId }` | 파티 수락 |
  | C→S | `party:decline` | `{ partyId }` | 파티 거절 |
  | C→S | `party:leave` | `{ partyId }` | 파티 탈퇴 |
  | C→S | `party:message` | `{ partyId, content }` | 파티 채팅 |
  | C→S | `proximity:set` | `{ enabled: boolean }` | 근접 모드 설정 (OWNER/STAFF) |
  | C→S | `joinParty` | `{ partyId, partyName }` | 파티 존 입장 |
  | C→S | `leaveParty` | - | 파티 존 퇴장 |
  | S→C | `room:joined` | `{ spaceId, players, yourPlayerId }` | 입장 완료 |
  | S→C | `player:joined` | `PlayerPosition` | 타 플레이어 입장 |
  | S→C | `player:left` | `{ id }` | 플레이어 퇴장 |
  | S→C | `player:moved` | `PlayerPosition` | 위치 동기화 |
  | S→C | `player:jumped` | `PlayerJumpData` | 점프 동기화 |
  | S→C | `chat:message` | `ChatMessageData` | 채팅 수신 |
  | S→C | `chat:system` | `ChatMessageData` | 시스템 메시지 |
  | S→C | `whisper:received` | `{ senderId, senderName, content }` | 귓속말 수신 |
  | S→C | `party:invited` | `{ partyId, partyName, inviterId }` | 파티 초대 수신 |
  | S→C | `party:joined` | `{ partyId, members }` | 파티 입장 완료 |
  | S→C | `party:message` | `{ partyId, senderId, senderName, content }` | 파티 채팅 수신 |
  | S→C | `party:member_left` | `{ partyId, memberId }` | 파티원 퇴장 |
  | S→C | `proximity:changed` | `{ spaceId, enabled }` | 근접 모드 변경 브로드캐스트 |
  | S→C | `proximity:error` | `{ message }` | 근접 설정 에러 |
  | S→C | `error` | `{ message }` | 일반 에러 |
- **Evidence**:
  - code: `server/handlers/`

### Contract: SOCKET_FUNC_SESSION_VERIFY

- **What**: 세션 검증 + 서버 파생 ID 강제
- **Rules**:
  - 클라이언트 ID 직접 신뢰 금지 (`position.id` 사용 금지)
  - 서버 검증 ID 사용 필수 (`socket.data.playerId`)
  - 운영환경: 검증 실패 시 연결 거부
  - 개발환경: 경고 후 진행 허용
  - `dev-*` 세션: 검증 스킵
- **Evidence**:
  - code: `server/handlers/room.ts`

### Contract: SOCKET_FUNC_ROOM_STATE

- **What**: 방 상태 관리
- **Rules**:
  ```typescript
  // spaceId → Map<playerId, PlayerPosition>
  const rooms = new Map<string, Map<string, PlayerPosition>>()

  interface SocketData {
    spaceId: string
    playerId: string       // 서버 검증 ID
    nickname: string
    avatarColor: AvatarColor
    sessionToken?: string
  }
  ```
- **Evidence**:
  - code: `server/state.ts`

### Contract: SOCKET_FUNC_METRICS

- **What**: /metrics 엔드포인트 (v2.0.0)
- **Rules**:
  - `GET http://[OCI_IP]:3001/metrics`
  - 응답: `{ server, version, timestamp, uptime, connections, parties, process, storage }`
  - storage: `{ totalGB, usedGB, availableGB, usedPercent, mountPoint }`
- **Evidence**:
  - code: `server/index.ts`

### Contract: SOCKET_FUNC_LOGGING

- **What**: JSON 구조화 로깅 + 에러 코드 체계
- **Rules**:
  | 코드 | 분류 | 설명 |
  |-----|------|------|
  | E1xxx | 인증 | 세션 검증 실패, 권한 없음 |
  | E2xxx | 연결 | Socket 연결 에러 |
  | E3xxx | 이벤트 | 이벤트 처리 실패 |
  | E4xxx | 외부 API | API 호출 실패 |

  | 레벨 | 용도 |
  |-----|------|
  | `error` | 에러 (Discord 알림) |
  | `warn` | 경고 |
  | `info` | 정보 |
  | `debug` | 개발 모드만 |
- **Evidence**:
  - code: `server/utils/logger.ts`, `server/config.ts`

### Contract: SOCKET_FUNC_DISCORD

- **What**: Discord Webhook 에러 알림
- **Rules**:
  - 환경변수: `DISCORD_ERROR_WEBHOOK_URL`
  - 알림 대상: 서버 에러 (심각), 연결 에러
  - 메시지: embed 형식 (title, description, color, fields)
- **Evidence**:
  - code: `server/utils/logger.ts`

### Contract: SOCKET_FUNC_PROXIMITY

- **What**: 근접 통신 이벤트
- **Rules**:
  - `proximity:set`: OWNER/STAFF만 설정 가능
  - `proximity:changed`: 전체 브로드캐스트
  - `proximity:error`: 권한 없음 등 에러
- **Evidence**:
  - code: `server/handlers/media.ts`

### Contract: SOCKET_FUNC_PARTY

- **What**: 파티/파티존 이벤트
- **Rules**:
  - `joinParty` / `leaveParty`: 파티 존 입/퇴장
  - `party:*` 이벤트: 파티 생성, 초대, 수락, 거절, 탈퇴, 메시지
- **Evidence**:
  - code: `server/handlers/party.ts`

### Contract: SOCKET_FUNC_EVENT_LOGGING

- **What**: 이벤트 로깅 (ENTER/EXIT)
- **Rules**:
  | 세션 패턴 | 처리 | 설명 |
  |----------|------|------|
  | `dev-*` | 스킵 | 개발 모드 |
  | `guest-*` | logGuestEvent | Guest API 로깅 |
  | `auth-*` | logAuthUserEvent | Visit API 로깅 |
- **Evidence**:
  - code: `server/services/event-logger.ts`

---

## SPACE

### Contract: SPACE_API_CRUD

- **What**: 공간 CRUD API (생성, 조회, 수정, 삭제)
- **Evidence**:
  - code: `src/app/api/spaces/route.ts::POST`
  - code: `src/app/api/spaces/route.ts::GET`
  - code: `src/app/api/spaces/[id]/route.ts::GET`
  - code: `src/app/api/spaces/[id]/route.ts::PATCH`
  - code: `src/app/api/spaces/[id]/route.ts::DELETE`

### Contract: SPACE_API_JOIN

- **What**: 공간 입장 API
- **Evidence**:
  - code: `src/app/api/spaces/[id]/join/route.ts::POST`
  - code: `prisma/schema.prisma::SpaceMember`

### Contract: SPACE_API_INVITE

- **What**: 초대 코드 기반 공간 접근 API
- **Evidence**:
  - code: `src/app/api/spaces/invite/[code]/route.ts::GET`
  - code: `prisma/schema.prisma`

### Contract: SPACE_API_VISIT

- **What**: 공간 방문 기록 API
- **Evidence**:
  - code: `src/app/api/spaces/[id]/visit/route.ts::POST`
  - code: `prisma/schema.prisma::SpaceEventLog`

### Contract: SPACE_API_MY_ROLE

- **What**: 현재 사용자의 공간 내 역할 조회 API
- **Evidence**:
  - code: `src/app/api/spaces/[id]/my-role/route.ts::GET`
  - code: `src/lib/space-auth.ts::SpaceMemberInfo`

### Contract: SPACE_API_MEMBERS

- **What**: 공간 멤버 관리 API (목록, 추가, 역할 변경)
- **Evidence**:
  - code: `src/app/api/spaces/[id]/members/route.ts::GET`
  - code: `src/app/api/spaces/[id]/members/route.ts::POST`

### Contract: SPACE_API_KICK

- **What**: 멤버 강퇴 API
- **Evidence**:
  - code: `src/app/api/spaces/[id]/members/[memberId]/kick/route.ts::POST`
  - code: `src/lib/space-permissions.ts::canManage`

### Contract: SPACE_API_MUTE

- **What**: 멤버 음소거 API
- **Evidence**:
  - code: `src/app/api/spaces/[id]/members/[memberId]/mute/route.ts::POST`
  - code: `src/lib/space-permissions.ts::hasPermission`

### Contract: SPACE_API_STAFF

- **What**: 스태프 관리 API (지정/해제)
- **Evidence**:
  - code: `src/app/api/spaces/[id]/staff/route.ts::POST`
  - code: `src/app/api/spaces/[id]/staff/[userId]/route.ts::DELETE`

### Contract: SPACE_API_OBJECTS

- **What**: 공간 오브젝트 관리 API
- **Evidence**:
  - code: `src/app/api/spaces/[id]/objects/route.ts::GET`
  - code: `src/app/api/spaces/[id]/objects/route.ts::POST`

### Contract: SPACE_API_ZONES

- **What**: 파티 존 관리 API
- **Evidence**:
  - code: `src/app/api/spaces/[id]/zones/route.ts::GET`
  - code: `src/app/api/spaces/[id]/zones/route.ts::POST`
  - code: `src/app/api/spaces/[id]/zones/[zoneId]/route.ts::PUT`
  - code: `src/app/api/spaces/[id]/zones/[zoneId]/route.ts::DELETE`

### Contract: SPACE_API_SPOTLIGHT

- **What**: 스포트라이트 관리 API
- **Evidence**:
  - code: `src/app/api/spaces/[id]/spotlight/route.ts::GET`
  - code: `src/app/api/spaces/[id]/spotlight/activate/route.ts::POST`

### Contract: SPACE_API_MESSAGES

- **What**: 채팅 메시지 API (히스토리 조회, 삭제)
- **Evidence**:
  - code: `src/app/api/spaces/[id]/messages/route.ts::GET`
  - code: `src/app/api/spaces/[id]/messages/[messageId]/route.ts::DELETE`

### Contract: SPACE_API_MY_SPACES

- **What**: 내 참여 공간 목록 API
- **Evidence**:
  - code: `src/app/api/my-spaces/route.ts::GET`

### Contract: SPACE_API_TEMPLATES

- **What**: 공간 템플릿 목록 API
- **Evidence**:
  - code: `src/app/api/templates/route.ts::GET`
  - code: `prisma/schema.prisma::TemplateKey`

### Contract: SPACE_COMP_LAYOUT

- **What**: SpaceLayout 전체 레이아웃 컴포넌트
- **Evidence**:
  - code: `src/features/space/components/SpaceLayout.tsx`
  - code: `src/features/space/components/SpaceHeader.tsx`

### Contract: SPACE_COMP_VIDEO_TILE

- **What**: VideoTile 개별 비디오 타일
- **Evidence**:
  - code: `src/features/space/components/video/VideoTile.tsx`
  - code: `src/features/space/components/video/ParticipantPanel.tsx`
  - code: `src/features/space/components/video/ScreenShare.tsx`

### Contract: SPACE_COMP_CONTROL_BAR

- **What**: ControlBar 하단 미디어 컨트롤
- **Evidence**:
  - code: `src/features/space/components/controls/ControlBar.tsx`

### Contract: SPACE_COMP_CHAT_OVERLAY

- **What**: FloatingChatOverlay 게임 위 플로팅 채팅
- **Evidence**:
  - code: `src/features/space/components/chat/FloatingChatOverlay.tsx`
  - code: `src/features/space/components/chat/ChatTabs.tsx`
  - code: `src/features/space/components/chat/ChatMessageList.tsx`
  - code: `src/features/space/components/chat/ChatInputArea.tsx`

### Contract: SPACE_COMP_MEDIA_SETTINGS

- **What**: MediaSettingsModal 디스코드 스타일 설정
- **Evidence**:
  - code: `src/features/space/components/settings/MediaSettingsModal.tsx`
  - code: `src/features/space/components/settings/AudioSettingsTab.tsx`
  - code: `src/features/space/components/settings/VideoSettingsTab.tsx`
  - code: `src/features/space/components/settings/DeviceSelector.tsx`
  - code: `src/features/space/components/settings/VolumeMeter.tsx`

### Contract: SPACE_HOOK_SOCKET

- **What**: useSocket Socket.io 연결 훅
- **Evidence**:
  - code: `src/features/space/socket/useSocket.ts`
  - code: `src/features/space/socket/types.ts`

### Contract: SPACE_HOOK_CHAT_MODE

- **What**: useChatMode 채팅 모드 상태 관리
- **Evidence**:
  - code: `src/features/space/hooks/useChatMode.ts`
  - code: `src/features/space/hooks/useChatDrag.ts`
  - code: `src/features/space/hooks/useChatStorage.ts`

### Contract: SPACE_HOOK_PROXIMITY

- **What**: useProximitySubscription 7x7 근접 통신 구독
- **Evidence**:
  - code: `src/features/space/livekit/useProximitySubscription.ts`

### Contract: SPACE_HOOK_PARTY_ZONE

- **What**: usePartyZone 파티 존 감지/관리
- **Evidence**:
  - code: `src/features/space/hooks/usePartyZone.ts`

### Contract: SPACE_UTIL_CHAT_PARSER

- **What**: chatParser 채팅 명령어 파싱
- **Evidence**:
  - code: `src/features/space/utils/chatParser.ts`
  - code: `src/features/space/utils/commandHints.ts`

---

## UI_COMPONENT

### Contract: UI_COMPONENT_FUNC_BUTTON

- **What**: 버튼 컴포넌트 (variant: default, outline, destructive, ghost)
- **Evidence**:
  - code: `src/components/ui/button.tsx::Button`
  - code: `src/components/ui/button.tsx::buttonVariants`
  - code: `src/components/ui/button.tsx::ButtonProps`

### Contract: UI_COMPONENT_FUNC_MODAL

- **What**: 모달/다이얼로그 컴포넌트 (접근성 완비)
- **Evidence**:
  - code: `src/components/ui/dialog.tsx::Dialog`
  - code: `src/components/ui/dialog.tsx::DialogContent`
  - code: `src/components/ui/dialog.tsx::DialogOverlay`
  - code: `src/components/ui/dialog.tsx::DialogTitle`

### Contract: UI_COMPONENT_FUNC_FORM

- **What**: 폼 컴포넌트 (Input 기반)
- **Evidence**:
  - code: `src/components/ui/input.tsx::Input`

### Contract: UI_COMPONENT_FUNC_ICON

- **What**: 아이콘 시스템 (lucide-react)
- **Evidence**:
  - code: `src/components/ui/dialog.tsx`
  - code: `package.json`

### Contract: UI_COMPONENT_FUNC_MEMBER_MGMT

- **What**: MemberManagement 멤버 관리 통합 컴포넌트
- **Evidence**:
  - code: `src/components/space/MemberManagement.tsx`
  - code: `src/components/space/MemberList.tsx`

### Contract: UI_COMPONENT_FUNC_ROLE_BADGE

- **What**: RoleBadge 역할 뱃지 컴포넌트
- **Rules**:
  | 역할 | 색상 | 의미 |
  |-----|------|------|
  | SuperAdmin | 보라색 | 플랫폼 관리자 |
  | OWNER | 파란색 | 공간 소유자 |
  | STAFF | 초록색 | 운영 스태프 |
  | PARTICIPANT | 회색 | 일반 참가자 |
- **Evidence**:
  - code: `src/components/space/RoleBadge.tsx`

### Contract: UI_COMPONENT_FUNC_MEMBER_SEARCH

- **What**: MemberSearchInput 멤버 검색 컴포넌트
- **Evidence**:
  - code: `src/components/space/MemberSearchInput.tsx`

---

## UI_SYSTEM

### Contract: UI_SYSTEM_FUNC_TOKEN_FLOW

- **What**: Primary Color → globals.css → 컴포넌트 연결 흐름
- **Evidence**:
  - code: `src/app/globals.css`
  - code: `src/components/ui/button.tsx::buttonVariants`
  - code: `src/lib/utils.ts::cn`

### Contract: UI_SYSTEM_FUNC_TEXT_CONFIG

- **What**: 텍스트 설정 시스템 (i18n)
- **Evidence**:
  - code: `src/lib/text-config.ts::BUTTON_TEXT`
  - code: `src/lib/text-config.ts::isAppsInToss`

---

## USER

### Contract: USER_API_NAV

- **What**: 사용자 네비게이션 정보 API
- **Evidence**:
  - code: `src/app/api/users/me/nav/route.ts::GET`
  - code: `src/lib/auth.ts::auth`

### Contract: USER_API_SEARCH

- **What**: 사용자 검색 API (멤버 초대용)
- **Evidence**:
  - code: `src/app/api/users/search/route.ts::GET`
  - code: `prisma/schema.prisma::User`

---


---

> **자동 생성**: 2026-01-22 15:28:43
> **Spec 문서 수**: 19