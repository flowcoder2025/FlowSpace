# TASK: 공간 생성 권한 제한 (구독자/SuperAdmin 전용)

> **시작일**: 2025-12-28
> **완료일**: 2025-12-28
> **목표**: 공간 생성을 SuperAdmin 또는 유료 구독자만 가능하도록 제한

---

## Phase 1: 권한 헬퍼 함수 추가 ✅ 완료

- [x] `canCreateSpace()` 함수를 `space-auth.ts`에 추가
- [x] SuperAdmin 체크 로직 포함
- [x] 유료 구독자(PRO/PREMIUM) 체크 로직 포함

**파일**: `src/lib/space-auth.ts` (line 67-89)

## Phase 2: API 권한 체크 ✅ 완료

- [x] `/api/spaces/route.ts` POST 핸들러에 권한 체크 추가
- [x] 권한 없을 시 403 응답 반환
- [x] 에러 메시지 명확하게 작성

**파일**: `src/app/api/spaces/route.ts` (line 60-67)

## Phase 3: Frontend 권한 처리 ✅ 완료

- [x] `/spaces/new/page.tsx`를 서버 컴포넌트로 분리
- [x] 권한 체크 후 안내 UI 표시 (NoPermissionView)
- [x] 클라이언트 폼 컴포넌트 분리 (CreateSpaceForm.tsx)

**파일**:
- `src/app/spaces/new/page.tsx` (서버 컴포넌트)
- `src/app/spaces/new/CreateSpaceForm.tsx` (클라이언트 폼)

## Phase 4: 검증 ✅ 완료

- [x] 타입 체크 (`npx tsc --noEmit`) - 통과
- [x] 빌드 테스트 (`npm run build`) - 통과

---

## 진행 상태

| Phase | 상태 | 완료일 |
|:-----:|:----:|:------:|
| 1 | ✅ 완료 | 2025-12-28 |
| 2 | ✅ 완료 | 2025-12-28 |
| 3 | ✅ 완료 | 2025-12-28 |
| 4 | ✅ 완료 | 2025-12-28 |

---

## 변경 파일 목록

| 파일 | 변경 내용 |
|------|----------|
| `src/lib/space-auth.ts` | `canCreateSpace()` 헬퍼 추가 |
| `src/app/api/spaces/route.ts` | POST 권한 체크 추가 |
| `src/app/spaces/new/page.tsx` | 서버 컴포넌트화 + 권한 체크 |
| `src/app/spaces/new/CreateSpaceForm.tsx` | 클라이언트 폼 분리 (신규) |

---

## 권한 로직 요약

```typescript
// canCreateSpace(userId) 반환 조건:
// 1. SuperAdmin → true
// 2. 유료 구독자 (PRO/PREMIUM + ACTIVE 상태) → true
// 3. 그 외 → false
```
