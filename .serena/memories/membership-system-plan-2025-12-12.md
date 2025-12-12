# 멤버십 시스템 및 역할별 대시보드 개선 계획

## 현재 문제점
| 문제 | 현재 상태 | 필요한 상태 |
|-----|----------|------------|
| 운영자 대시보드 접근 | 누구나 /admin 접근 가능 | SuperAdmin만 접근 |
| 공간 관리자 뷰 | 모든 공간 표시 | 본인 소유 공간만 |
| 멤버 뷰 | 없음 | 본인이 멤버인 공간 목록 |
| 멤버십 생성 | 수동/없음 | URL 입장 시 자동 생성 |

## 목표 아키텍처
```
SuperAdmin (isSuperAdmin=true)
└── /admin (플랫폼 전체 관리)

Owner (Space.ownerId = userId)
└── /dashboard (본인 소유 공간 관리)

Staff (SpaceMember.role = STAFF)
└── /dashboard (Staff로 지정된 공간 관리, 제한적)

Member (SpaceMember.role = PARTICIPANT)
└── /my-spaces (참여 공간 목록)
```

## Phase별 계획

### Phase 1: 자동 멤버십 생성 🟢 진행 중
- `/api/spaces/[id]/join` POST API 생성
- 인증 사용자: userId로 SpaceMember 조회/생성
- 게스트: guestSessionId로 SpaceMember 조회/생성
- `page.tsx`에서 공간 입장 전 join API 호출
- Socket join:space에서 멤버십 ID 확인

### Phase 2: SuperAdmin 전용 /admin ⏳
- `isSuperAdmin(userId)` 헬퍼 함수 생성
- `/admin/layout.tsx` 생성 - 권한 없으면 리다이렉트
- `/api/admin/*` 모든 API에 SuperAdmin 체크

### Phase 3: Owner/Staff용 /dashboard ⏳
- `/api/dashboard/spaces` - 본인이 OWNER/STAFF인 공간 목록
- `/dashboard` 페이지 - 관리 공간 목록 표시
- `/dashboard/spaces/[id]` - 개별 공간 상세 관리

### Phase 4: Member용 /my-spaces ⏳
- `/api/my-spaces` - SpaceMember로 연결된 공간 목록
- `/my-spaces` 페이지 - 참여 공간 카드 목록

### Phase 5: 네비게이션 통합 ⏳
- 헤더에 역할별 네비게이션 링크
- SuperAdmin: /admin 표시
- Owner/Staff: /dashboard 표시
- 모든 사용자: /my-spaces 표시

## 핵심 파일
- `/src/app/api/spaces/[id]/join/route.ts` 🆕
- `/src/app/admin/layout.tsx` 🆕
- `/src/app/dashboard/page.tsx` 🆕
- `/src/app/my-spaces/page.tsx` 🆕
- `/src/lib/auth.ts` (isSuperAdmin 헬퍼)

## 진행 상태
- Phase 1: ⏳ 대기
- Phase 2: ⏳ 대기
- Phase 3: ⏳ 대기
- Phase 4: ⏳ 대기
- Phase 5: ⏳ 대기
