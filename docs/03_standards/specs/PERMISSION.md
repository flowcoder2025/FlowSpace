# PERMISSION - 권한 및 구독 시스템

> 공간 내 역할 기반 권한 체계 및 SaaS 구독 플랜 관리

---

## 개요

SUPER_ADMIN → SPACE_OWNER → STAFF → PARTICIPANT 계층 구조의 권한 시스템

---

## 역할 계층

```
SUPER_ADMIN (플랫폼 운영자)
    ├── 플랫폼 전체 관리 권한
    ├── 모든 공간 접근 가능
    └── 구독/결제 관리

SPACE_OWNER (공간 소유자 = 구독자)
    ├── 공간 생성/삭제/설정
    ├── STAFF 지정/해제
    └── 참가자 강퇴, 채팅 관리

STAFF (스탭)
    ├── 참가자 강퇴
    └── 채팅 관리 (삭제/음소거)

PARTICIPANT (참가자)
    ├── 공간 입장/채팅
    └── 음성/영상 참여
```

---

<!-- FUNCTIONAL:BEGIN -->

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

<!-- FUNCTIONAL:END -->

---

## 구독 티어

| 티어 | 월 요금 | 공간 수 | 최대 동접 |
|------|--------|--------|----------|
| FREE | 무료 | 1 | 10 |
| PRO | ₩29,000 | 5 | 50 |
| PREMIUM | ₩99,000 | 무제한 | 200 |

---

## 권한 매트릭스

| 권한 | OWNER | STAFF | PARTICIPANT |
|------|:-----:|:-----:|:-----------:|
| space:delete | ✅ | ❌ | ❌ |
| space:settings | ✅ | ❌ | ❌ |
| staff:assign | ✅ | ❌ | ❌ |
| member:mute | ✅ | ✅ | ❌ |
| member:kick | ✅ | ✅ | ❌ |
| chat:delete | ✅ | ✅ | ❌ |

---

## 참조

- 원본: `docs/architecture/phase6-permissions-spec.md`

---

> **마이그레이션**: 2026-01-21 DocOps 자동 변환
