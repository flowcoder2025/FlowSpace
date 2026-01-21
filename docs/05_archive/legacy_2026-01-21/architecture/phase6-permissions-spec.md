# Phase 6: 권한 및 구독 시스템 스펙

> **Phase 6 목표**: SaaS 비즈니스 모델 기반 권한 체계, 구독 플랜 관리, 채팅 관리 시스템 구현
> **참조**: `/docs/PRD.md` Phase 6 항목

---

## 1. 비즈니스 모델 개요

### 1.1 역할 계층 구조

```
SUPER_ADMIN (플랫폼 운영자)
    │
    ├── 플랫폼 전체 관리 권한
    ├── 모든 공간 접근 가능
    ├── 구독/결제 관리
    └── 사용자 계정 관리

SPACE_OWNER (공간 소유자 = 구독자)
    │
    ├── 공간 생성/삭제/설정
    ├── STAFF 지정/해제
    ├── 참가자 강퇴
    ├── 채팅 관리 (삭제/음소거)
    └── 공간 통계 조회

STAFF (스탭 = OWNER가 지정)
    │
    ├── 참가자 강퇴
    ├── 채팅 관리 (삭제/음소거)
    └── 공간 통계 조회 (제한적)

PARTICIPANT (참가자)
    │
    ├── 공간 입장/채팅
    ├── 음성/영상 참여
    └── 프로필 관리
```

### 1.2 구독 티어

| 티어 | 월 요금 | 공간 수 | 최대 동접 | 기능 |
|------|--------|--------|----------|------|
| FREE | 무료 | 1 | 10 | 기본 기능 |
| PRO | ₩29,000 | 5 | 50 | 브랜딩, 통계 |
| PREMIUM | ₩99,000 | 무제한 | 200 | 우선 지원, API |

---

## 2. 데이터 모델 확장

### 2.1 새 Enum 타입

```prisma
// 공간 내 역할
enum SpaceRole {
  OWNER       // 공간 소유자 (= 생성자 or STAFF + 소유권 이전)
  STAFF       // 운영 스탭
  PARTICIPANT // 일반 참가자
}

// 채팅 제재 상태
enum ChatRestriction {
  NONE        // 제한 없음
  MUTED       // 채팅 금지
  BANNED      // 강퇴됨
}
```

### 2.2 SpaceMember 테이블 (신규)

```prisma
// 공간 멤버십 (역할 + 제재 상태)
model SpaceMember {
  id          String          @id @default(cuid())
  spaceId     String
  userId      String?         // 인증된 사용자
  guestId     String?         // 게스트 세션 ID

  role        SpaceRole       @default(PARTICIPANT)
  restriction ChatRestriction @default(NONE)
  restrictedUntil DateTime?   // 일시적 음소거 종료 시간
  restrictedBy    String?     // 제재 실행자 ID
  restrictedReason String?    // 제재 사유

  space       Space           @relation(fields: [spaceId], references: [id], onDelete: Cascade)
  user        User?           @relation(fields: [userId], references: [id], onDelete: Cascade)

  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt

  @@unique([spaceId, userId])
  @@unique([spaceId, guestId])
  @@index([spaceId, role])
  @@index([userId])
}
```

### 2.3 ChatMessage 테이블 (신규)

```prisma
// 채팅 메시지 영속화 (관리용)
model ChatMessage {
  id          String      @id @default(cuid())
  spaceId     String
  senderId    String?     // userId 또는 guestId
  senderType  SenderType  // USER or GUEST
  senderName  String      // 표시 이름

  content     String      @db.Text
  type        MessageType @default(MESSAGE)
  targetId    String?     // whisper 대상 or partyId

  isDeleted   Boolean     @default(false)
  deletedBy   String?     // 삭제 실행자 ID
  deletedAt   DateTime?

  space       Space       @relation(fields: [spaceId], references: [id], onDelete: Cascade)

  createdAt   DateTime    @default(now())

  @@index([spaceId, createdAt])
  @@index([senderId])
}

enum SenderType {
  USER
  GUEST
}

enum MessageType {
  MESSAGE     // 공개 채팅
  WHISPER     // 귓속말
  PARTY       // 파티 채팅
  SYSTEM      // 시스템 메시지
  ANNOUNCEMENT // 공지
}
```

### 2.4 기존 모델 수정

```prisma
// User 모델에 추가
model User {
  // ... 기존 필드

  isSuperAdmin Boolean @default(false) // 플랫폼 관리자

  // Relations 추가
  spaceMemberships SpaceMember[]
}

// Space 모델에 추가
model Space {
  // ... 기존 필드

  // Relations 추가
  members      SpaceMember[]
  chatMessages ChatMessage[]
}

// Subscription 모델 수정
model Subscription {
  // ... 기존 필드

  // 플랜별 제한
  maxSpaces     Int @default(1)
  maxUsersPerSpace Int @default(10)
}
```

---

## 3. API 설계

### 3.1 권한 관리 API

#### STAFF 지정/해제

```
POST   /api/spaces/{spaceId}/staff
Body:  { userId: string }
Auth:  SPACE_OWNER only
Response: { success: true, member: SpaceMember }

DELETE /api/spaces/{spaceId}/staff/{userId}
Auth:  SPACE_OWNER only
Response: { success: true }
```

### 3.2 채팅 관리 API

#### 메시지 삭제

```
DELETE /api/spaces/{spaceId}/messages/{messageId}
Auth:  STAFF or OWNER
Response: { success: true }

Socket Event: chat:message_deleted { messageId, deletedBy }
```

#### 음소거

```
POST   /api/spaces/{spaceId}/members/{memberId}/mute
Body:  { duration: number (minutes), reason?: string }
Auth:  STAFF or OWNER
Response: { success: true, mutedUntil: DateTime }

Socket Event: member:muted { memberId, mutedUntil, reason }
```

#### 음소거 해제

```
DELETE /api/spaces/{spaceId}/members/{memberId}/mute
Auth:  STAFF or OWNER
Response: { success: true }

Socket Event: member:unmuted { memberId }
```

#### 강퇴

```
POST   /api/spaces/{spaceId}/members/{memberId}/kick
Body:  { reason?: string, ban?: boolean }
Auth:  STAFF or OWNER
Response: { success: true }

Socket Event: member:kicked { memberId, reason }
```

### 3.3 구독 관리 API

#### 플랜 조회

```
GET    /api/subscription/plans
Response: { plans: SubscriptionPlan[] }
```

#### 현재 구독 조회

```
GET    /api/subscription
Auth:  Required
Response: { subscription: Subscription, usage: UsageStats }
```

#### 구독 업그레이드/다운그레이드

```
POST   /api/subscription/upgrade
Body:  { tier: SubscriptionTier, paymentMethodId?: string }
Auth:  Required
Response: { subscription: Subscription, stripeClientSecret?: string }
```

---

## 4. Socket.io 이벤트 확장

### 4.1 관리 이벤트 (서버 → 클라이언트)

| 이벤트 | 페이로드 | 설명 |
|--------|---------|------|
| `member:muted` | `{ memberId, mutedUntil, reason }` | 음소거됨 알림 |
| `member:unmuted` | `{ memberId }` | 음소거 해제됨 |
| `member:kicked` | `{ memberId, reason }` | 강퇴됨 (대상에게만) |
| `member:role_changed` | `{ memberId, newRole }` | 역할 변경됨 |
| `chat:message_deleted` | `{ messageId, deletedBy }` | 메시지 삭제됨 |
| `space:announcement` | `{ content, senderId }` | 공지 메시지 |

### 4.2 관리 이벤트 (클라이언트 → 서버)

| 이벤트 | 페이로드 | 권한 | 설명 |
|--------|---------|------|------|
| `admin:mute` | `{ targetId, duration, reason? }` | STAFF+ | 음소거 |
| `admin:unmute` | `{ targetId }` | STAFF+ | 음소거 해제 |
| `admin:kick` | `{ targetId, reason?, ban? }` | STAFF+ | 강퇴 |
| `admin:delete_message` | `{ messageId }` | STAFF+ | 메시지 삭제 |
| `admin:announce` | `{ content }` | OWNER | 공지 발송 |

---

## 5. UI 컴포넌트

### 5.1 채팅 관리 UI

```
FloatingChatOverlay
├── ChatMessage (우클릭 메뉴 추가)
│   ├── 메시지 삭제 (STAFF+)
│   ├── 사용자 음소거 (STAFF+)
│   └── 사용자 강퇴 (STAFF+)
└── 관리 버튼 (STAFF+ 전용)
    ├── 공지 발송
    └── 참가자 관리
```

### 5.2 참가자 관리 패널

```
ParticipantPanel
├── ParticipantItem
│   ├── 역할 배지 (OWNER/STAFF)
│   ├── 음소거 상태 아이콘
│   └── 관리 메뉴 (STAFF+)
│       ├── STAFF 지정/해제 (OWNER)
│       ├── 음소거 (STAFF+)
│       └── 강퇴 (STAFF+)
└── 필터/검색
```

### 5.3 구독 관리 페이지

```
/settings/subscription
├── 현재 플랜 정보
├── 사용량 현황
│   ├── 공간 수: X / Y
│   └── 총 동접: X / Y
├── 플랜 비교표
└── 업그레이드/다운그레이드 버튼
```

### 5.4 가격 페이지

```
/pricing
├── 플랜 비교 카드 (3열)
├── FAQ 섹션
└── 문의 링크
```

---

## 6. 권한 체크 함수

### 6.1 공간 권한 유틸리티

```typescript
// src/lib/space-permissions.ts

export type SpacePermission =
  | 'space:delete'       // 공간 삭제
  | 'space:settings'     // 공간 설정 변경
  | 'staff:assign'       // STAFF 지정
  | 'staff:remove'       // STAFF 해제
  | 'member:mute'        // 음소거
  | 'member:kick'        // 강퇴
  | 'chat:delete'        // 채팅 삭제
  | 'chat:announce'      // 공지 발송
  | 'stats:view'         // 통계 조회
  | 'stats:export'       // 통계 내보내기

const ROLE_PERMISSIONS: Record<SpaceRole, SpacePermission[]> = {
  OWNER: [
    'space:delete', 'space:settings',
    'staff:assign', 'staff:remove',
    'member:mute', 'member:kick',
    'chat:delete', 'chat:announce',
    'stats:view', 'stats:export'
  ],
  STAFF: [
    'member:mute', 'member:kick',
    'chat:delete',
    'stats:view'
  ],
  PARTICIPANT: []
}

export function hasPermission(
  role: SpaceRole,
  permission: SpacePermission
): boolean {
  return ROLE_PERMISSIONS[role].includes(permission)
}

export function canManage(
  actorRole: SpaceRole,
  targetRole: SpaceRole
): boolean {
  const hierarchy = { OWNER: 3, STAFF: 2, PARTICIPANT: 1 }
  return hierarchy[actorRole] > hierarchy[targetRole]
}
```

### 6.2 API 미들웨어

```typescript
// src/lib/middleware/space-auth.ts

export async function requireSpaceRole(
  req: NextRequest,
  spaceId: string,
  minRole: SpaceRole
): Promise<{ member: SpaceMember; user: User | null }> {
  const session = await auth()

  // SUPER_ADMIN은 모든 공간에 OWNER 권한
  if (session?.user && await isSuperAdmin(session.user.id)) {
    return { member: { role: 'OWNER' }, user: session.user }
  }

  const member = await prisma.spaceMember.findUnique({
    where: {
      spaceId_userId: { spaceId, userId: session?.user?.id }
    }
  })

  if (!member || !canManage(member.role, minRole)) {
    throw new ForbiddenError('Insufficient permissions')
  }

  return { member, user: session?.user ?? null }
}
```

---

## 7. 구현 우선순위

### 7.1 Phase 6.1 - 기본 권한 (1주)

1. DB 스키마 마이그레이션 (SpaceMember 추가)
2. SpaceRole 기반 권한 체크 함수
3. Space 생성 시 OWNER 자동 지정
4. API 미들웨어 적용

### 7.2 Phase 6.2 - 채팅 관리 (1주)

1. ChatMessage 테이블 추가
2. 메시지 삭제 API + Socket 이벤트
3. 음소거/강퇴 API + Socket 이벤트
4. 채팅 UI에 관리 메뉴 추가

### 7.3 Phase 6.3 - STAFF 시스템 (0.5주)

1. STAFF 지정/해제 API
2. 참가자 패널에 관리 UI 추가
3. 역할 변경 실시간 반영

### 7.4 Phase 6.4 - 구독 시스템 (1주)

1. Stripe 연동 (결제)
2. 플랜별 제한 적용
3. 구독 관리 페이지
4. 가격 페이지

---

## 8. 보안 고려사항

### 8.1 권한 검증 원칙

- **서버 측 검증 필수**: 클라이언트 권한 표시는 UX용, 실제 권한은 서버에서 검증
- **역할 계층 검증**: STAFF는 PARTICIPANT만 관리 가능, OWNER만 STAFF 관리 가능
- **자기 자신 제외**: 자신을 강퇴/음소거 불가

### 8.2 Rate Limiting

| 작업 | 제한 |
|-----|------|
| 메시지 삭제 | 10회/분 |
| 음소거 | 5회/분 |
| 강퇴 | 3회/분 |
| 공지 발송 | 1회/분 |

### 8.3 감사 로그

모든 관리 작업은 `SpaceEventLog`에 기록:
- `MEMBER_MUTED`: 음소거
- `MEMBER_UNMUTED`: 음소거 해제
- `MEMBER_KICKED`: 강퇴
- `MESSAGE_DELETED`: 메시지 삭제
- `STAFF_ASSIGNED`: STAFF 지정
- `STAFF_REMOVED`: STAFF 해제

---

## 변경 이력

| 날짜 | 변경 |
|-----|------|
| 2025-12-11 | 초기 스펙 작성 |
