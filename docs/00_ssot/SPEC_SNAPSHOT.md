# SPEC_SNAPSHOT - 코드 인벤토리

> 자동 생성: specctl snapshot (2026-01-21 13:10:44)

---

## 스캔 정보

| 항목 | 값 |
|------|-----|
| **생성일** | 2026-01-21 |
| **도구** | specctl v0.2.0 |
| **프로젝트** | flow_metaverse |

---

## UI 라우트
| Route | File | SPEC_KEY |
|-------|------|----------|
| /admin/logs | src/app/admin/logs/page.tsx | UNCLASSIFIED |
| /admin/spaces/:id | src/app/admin/spaces/[id]/page.tsx | UNCLASSIFIED |
| /admin/spaces | src/app/admin/spaces/page.tsx | UNCLASSIFIED |
| /admin | src/app/admin/page.tsx | UNCLASSIFIED |
| /dashboard/spaces/:id | src/app/dashboard/spaces/[id]/page.tsx | DASHBOARD |
| /game-test | src/app/game-test/page.tsx | UNCLASSIFIED |
| /login | src/app/login/page.tsx | AUTH |
| /my-spaces | src/app/my-spaces/page.tsx | UNCLASSIFIED |
| /onboarding | src/app/onboarding/page.tsx | UNCLASSIFIED |
| /pricing | src/app/pricing/page.tsx | UNCLASSIFIED |
| /profile | src/app/profile/page.tsx | UNCLASSIFIED |
| /space/:id | src/app/space/[id]/page.tsx | UNCLASSIFIED |
| /spaces/new | src/app/spaces/new/page.tsx | UNCLASSIFIED |
| /spaces/:inviteCode | src/app/spaces/[inviteCode]/page.tsx | UNCLASSIFIED |
| / | src/app/page.tsx | UNCLASSIFIED |

---

## API 라우트
| Route | File | SPEC_KEY | Method |
|-------|------|----------|--------|
| /api/admin/logs | src/app/api/admin/logs/route.ts | API | GET |
| /api/admin/oci-metrics | src/app/api/admin/oci-metrics/route.ts | API | GET |
| /api/admin/spaces | src/app/api/admin/spaces/route.ts | API | GET |
| /api/admin/stats | src/app/api/admin/stats/route.ts | API | GET |
| /api/admin/usage/analysis | src/app/api/admin/usage/analysis/route.ts | API | GET |
| /api/admin/usage/debug | src/app/api/admin/usage/debug/route.ts | API | GET |
| /api/admin/usage/reset | src/app/api/admin/usage/reset/route.ts | API | POST |
| /api/auth/register | src/app/api/auth/register/route.ts | AUTH | POST |
| /api/auth/*nextauth | src/app/api/auth/[...nextauth]/route.ts | AUTH | POST |
| /api/cron/aggregate-usage | src/app/api/cron/aggregate-usage/route.ts | API | GET,POST |
| /api/cron/cleanup-messages | src/app/api/cron/cleanup-messages/route.ts | API | GET,POST |
| /api/cron/cleanup-sessions | src/app/api/cron/cleanup-sessions/route.ts | API | GET,POST |
| /api/cron/collect-metrics | src/app/api/cron/collect-metrics/route.ts | API | GET,POST |
| /api/dashboard/spaces/:id/export | src/app/api/dashboard/spaces/[id]/export/route.ts | API | GET,POST |
| /api/dashboard/spaces/:id/stats | src/app/api/dashboard/spaces/[id]/stats/route.ts | API | GET,POST |
| /api/guest/event | src/app/api/guest/event/route.ts | API | POST |
| /api/guest/exit | src/app/api/guest/exit/route.ts | API | POST |
| /api/guest/verify | src/app/api/guest/verify/route.ts | API | POST |
| /api/guest | src/app/api/guest/route.ts | API | POST |
| /api/livekit/token | src/app/api/livekit/token/route.ts | API | POST |
| /api/livekit/webhook | src/app/api/livekit/webhook/route.ts | API | POST |
| /api/my-spaces | src/app/api/my-spaces/route.ts | API | GET |
| /api/spaces/invite/:code | src/app/api/spaces/invite/[code]/route.ts | API | GET |
| /api/spaces/:id/join | src/app/api/spaces/[id]/join/route.ts | API | GET |
| /api/spaces/:id/members/:memberId/kick | src/app/api/spaces/[id]/members/[memberId]/kick/route.ts | API | GET |
| /api/spaces/:id/members/:memberId/mute | src/app/api/spaces/[id]/members/[memberId]/mute/route.ts | API | GET |
| /api/spaces/:id/members | src/app/api/spaces/[id]/members/route.ts | API | GET |
| /api/spaces/:id/messages/:messageId | src/app/api/spaces/[id]/messages/[messageId]/route.ts | API | GET |
| /api/spaces/:id/messages | src/app/api/spaces/[id]/messages/route.ts | API | GET |
| /api/spaces/:id/my-role | src/app/api/spaces/[id]/my-role/route.ts | API | GET |
| /api/spaces/:id/objects | src/app/api/spaces/[id]/objects/route.ts | API | GET |
| /api/spaces/:id/spotlight/activate | src/app/api/spaces/[id]/spotlight/activate/route.ts | API | GET |
| /api/spaces/:id/spotlight | src/app/api/spaces/[id]/spotlight/route.ts | API | GET |
| /api/spaces/:id/staff/:userId | src/app/api/spaces/[id]/staff/[userId]/route.ts | API | GET |
| /api/spaces/:id/staff | src/app/api/spaces/[id]/staff/route.ts | API | GET |
| /api/spaces/:id/visit | src/app/api/spaces/[id]/visit/route.ts | API | GET |
| /api/spaces/:id/zones/:zoneId | src/app/api/spaces/[id]/zones/[zoneId]/route.ts | API | GET |
| /api/spaces/:id/zones | src/app/api/spaces/[id]/zones/route.ts | API | GET |
| /api/spaces/:id | src/app/api/spaces/[id]/route.ts | API | GET |
| /api/spaces | src/app/api/spaces/route.ts | API | GET,POST |
| /api/templates | src/app/api/templates/route.ts | API | GET |
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
