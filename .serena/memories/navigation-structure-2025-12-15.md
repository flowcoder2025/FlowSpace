# 네비게이션 구조 통합 (2025-12-15)

## 변경 사항

### 페이지 구조 통합 (옵션 A)
- `/dashboard` 메인 페이지 → `/my-spaces`로 리다이렉트
- `/dashboard/spaces/[id]` 관리 페이지 → 유지 (개별 공간 관리)
- `/my-spaces` → 통합 페이지 (참여 + 관리 + 통계)

### 입장 경로 통일
- 모든 입장 버튼: `/space/{id}` 사용
- 기존 `/spaces/{inviteCode}` → `/space/{id}`로 변경

### API 변경
- `/api/my-spaces`: OWNER/STAFF 공간에 visitors, events 통계 추가 (SSOT)
- SSOT 로직: guestSessions + SpaceEventLog(ENTER) unique userId

### 네비게이션 버튼
- "공간 관리" 버튼 제거 (중복)
- "내 공간" 버튼만 유지 → `/my-spaces`
- "대시보드" 버튼 유지 (SuperAdmin 전용) → `/admin`

## 영향받는 파일
- `src/app/api/my-spaces/route.ts` - 통계 추가
- `src/app/dashboard/page.tsx` - 리다이렉트
- `src/app/my-spaces/page.tsx` - 통계 표시 + 경로 통일
- `src/app/dashboard/spaces/[id]/page.tsx` - 경로 수정
- `src/components/UserNav.tsx` - 버튼 정리

## 권한별 페이지 접근
| 권한 | /my-spaces | /dashboard | /admin |
|-----|-----------|-----------|--------|
| 일반 사용자 | ✅ | 리다이렉트 | ❌ |
| OWNER/STAFF | ✅ (통계 포함) | 리다이렉트 | ❌ |
| SuperAdmin | ✅ | 리다이렉트 | ✅ |
