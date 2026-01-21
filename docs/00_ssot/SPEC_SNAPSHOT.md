# SPEC_SNAPSHOT - 코드 인벤토리

> 자동 생성: specctl snapshot (2026-01-21 16:48:02)

---

## 스캔 정보

| 항목 | 값 |
|------|-----|
| **생성일** | 2026-01-21 |
| **도구** | specctl v0.3.0 |
| **프로젝트** | flow_metaverse |

---

## UI 라우트
| Route | File | SPEC_KEY |
|-------|------|----------|
| /admin/logs | src/app/admin/logs/page.tsx | PAGE |
| /admin/spaces/:id | src/app/admin/spaces/[id]/page.tsx | PAGE |
| /admin/spaces | src/app/admin/spaces/page.tsx | PAGE |
| /admin | src/app/admin/page.tsx | PAGE |
| /dashboard/spaces/:id | src/app/dashboard/spaces/[id]/page.tsx | PAGE |
| /game-test | src/app/game-test/page.tsx | PAGE |
| /login | src/app/login/page.tsx | AUTH |
| /my-spaces | src/app/my-spaces/page.tsx | PAGE |
| /onboarding | src/app/onboarding/page.tsx | PAGE |
| /pricing | src/app/pricing/page.tsx | PAGE |
| /profile | src/app/profile/page.tsx | PAGE |
| /space/:id | src/app/space/[id]/page.tsx | PAGE |
| /spaces/new | src/app/spaces/new/page.tsx | PAGE |
| /spaces/:inviteCode | src/app/spaces/[inviteCode]/page.tsx | PAGE |
| / | src/app/page.tsx | PAGE |

---

## API 라우트
| Route | File | SPEC_KEY | Method |
|-------|------|----------|--------|
| /api/admin/logs | src/app/api/admin/logs/route.ts | ADMIN | GET |
| /api/admin/oci-metrics | src/app/api/admin/oci-metrics/route.ts | ADMIN | GET |
| /api/admin/spaces | src/app/api/admin/spaces/route.ts | ADMIN | GET |
| /api/admin/stats | src/app/api/admin/stats/route.ts | ADMIN | GET |
| /api/admin/usage/analysis | src/app/api/admin/usage/analysis/route.ts | ADMIN | GET |
| /api/admin/usage/debug | src/app/api/admin/usage/debug/route.ts | ADMIN | GET |
| /api/admin/usage/reset | src/app/api/admin/usage/reset/route.ts | ADMIN | POST |
| /api/auth/register | src/app/api/auth/register/route.ts | AUTH | POST |
| /api/auth/*nextauth | src/app/api/auth/[...nextauth]/route.ts | AUTH | ALL |
| /api/cron/aggregate-usage | src/app/api/cron/aggregate-usage/route.ts | CRON | GET,POST |
| /api/cron/cleanup-messages | src/app/api/cron/cleanup-messages/route.ts | CRON | GET,POST |
| /api/cron/cleanup-sessions | src/app/api/cron/cleanup-sessions/route.ts | CRON | GET,POST |
| /api/cron/collect-metrics | src/app/api/cron/collect-metrics/route.ts | CRON | GET,POST |
| /api/dashboard/spaces/:id/export | src/app/api/dashboard/spaces/[id]/export/route.ts | DASHBOARD | GET |
| /api/dashboard/spaces/:id/stats | src/app/api/dashboard/spaces/[id]/stats/route.ts | DASHBOARD | GET |
| /api/guest/event | src/app/api/guest/event/route.ts | GUEST | POST |
| /api/guest/exit | src/app/api/guest/exit/route.ts | GUEST | POST |
| /api/guest/verify | src/app/api/guest/verify/route.ts | GUEST | POST |
| /api/guest | src/app/api/guest/route.ts | API | POST |
| /api/livekit/token | src/app/api/livekit/token/route.ts | LIVEKIT | POST |
| /api/livekit/webhook | src/app/api/livekit/webhook/route.ts | LIVEKIT | POST |
| /api/my-spaces | src/app/api/my-spaces/route.ts | SPACE | GET |
| /api/spaces/invite/:code | src/app/api/spaces/invite/[code]/route.ts | SPACE | GET |
| /api/spaces/:id/join | src/app/api/spaces/[id]/join/route.ts | SPACE | POST |
| /api/spaces/:id/members/:memberId/kick | src/app/api/spaces/[id]/members/[memberId]/kick/route.ts | SPACE | POST |
| /api/spaces/:id/members/:memberId/mute | src/app/api/spaces/[id]/members/[memberId]/mute/route.ts | SPACE | POST,DELETE |
| /api/spaces/:id/members | src/app/api/spaces/[id]/members/route.ts | SPACE | GET,POST,DELETE |
| /api/spaces/:id/messages/:messageId | src/app/api/spaces/[id]/messages/[messageId]/route.ts | SPACE | DELETE |
| /api/spaces/:id/messages | src/app/api/spaces/[id]/messages/route.ts | SPACE | GET |
| /api/spaces/:id/my-role | src/app/api/spaces/[id]/my-role/route.ts | SPACE | GET |
| /api/spaces/:id/objects | src/app/api/spaces/[id]/objects/route.ts | SPACE | GET,POST,DELETE |
| /api/spaces/:id/spotlight/activate | src/app/api/spaces/[id]/spotlight/activate/route.ts | SPACE | POST,DELETE |
| /api/spaces/:id/spotlight | src/app/api/spaces/[id]/spotlight/route.ts | SPACE | GET,POST,DELETE |
| /api/spaces/:id/staff/:userId | src/app/api/spaces/[id]/staff/[userId]/route.ts | SPACE | DELETE |
| /api/spaces/:id/staff | src/app/api/spaces/[id]/staff/route.ts | SPACE | GET,POST |
| /api/spaces/:id/visit | src/app/api/spaces/[id]/visit/route.ts | SPACE | POST,DELETE |
| /api/spaces/:id/zones/:zoneId | src/app/api/spaces/[id]/zones/[zoneId]/route.ts | SPACE | GET,PUT,DELETE |
| /api/spaces/:id/zones | src/app/api/spaces/[id]/zones/route.ts | SPACE | GET,POST |
| /api/spaces/:id | src/app/api/spaces/[id]/route.ts | SPACE | GET,DELETE |
| /api/spaces | src/app/api/spaces/route.ts | API | GET,POST |
| /api/templates | src/app/api/templates/route.ts | SPACE | GET |
| /api/user/consent | src/app/api/user/consent/route.ts | USER | GET,POST |
| /api/users/me/nav | src/app/api/users/me/nav/route.ts | USER | GET |
| /api/users/search | src/app/api/users/search/route.ts | USER | GET |

---

## 이벤트 타입

> 자동화 미구현 - 수동 관리

| Event | File | SPEC_KEY |
|-------|------|----------|
| (수동 추가 필요) | - | - |

---

## 상태 목록

> 자동화 미구현 - 수동 관리

| State | File | SPEC_KEY |
|-------|------|----------|
| (수동 추가 필요) | - | - |

---

> **참고**: UI/API 라우트는 자동 스캔됨. 이벤트/상태는 수동 관리 필요.
