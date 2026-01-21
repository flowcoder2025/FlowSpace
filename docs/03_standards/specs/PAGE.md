# PAGE - UI 페이지 스펙

> 모든 UI 라우트 페이지 컴포넌트 정의

---

## 개요

Next.js App Router 기반 페이지 컴포넌트 목록.
각 페이지는 독립적인 라우트를 가지며, 특정 기능/권한에 따라 접근 제한됨.

---

<!-- FUNCTIONAL:BEGIN -->

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

<!-- FUNCTIONAL:END -->

---

## 라우트 매핑

| Route | Page | 권한 |
|-------|------|------|
| `/` | LandingPage | Public |
| `/admin` | AdminDashboardPage | SuperAdmin |
| `/admin/logs` | AdminLogsPage | SuperAdmin |
| `/admin/spaces` | AdminSpacesPage | SuperAdmin |
| `/admin/spaces/[id]` | SpaceManagePage | SuperAdmin |
| `/space/[id]` | SpacePage | Participant |
| `/my-spaces` | MySpacesPage | Authenticated |
| `/profile` | ProfilePage | Authenticated |
| `/onboarding` | OnboardingPage | Authenticated |
| `/pricing` | PricingPage | Public |
| `/spaces/new` | CreateSpacePage | SuperAdmin/Subscriber |
| `/spaces/[inviteCode]` | SpaceEntryPage | Public |
| `/game-test` | GameTestPage | Public (Dev) |
| `/dashboard/spaces/[id]` | DashboardSpaceManagePage | Owner |
| `/login` | LoginPage | Public |

---

> **생성일**: 2026-01-21 DocOps Phase 1
