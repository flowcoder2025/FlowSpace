# USER - 사용자 API 스펙

> 사용자 프로필 및 검색 API

---

## 0. 요약

- **목적**: 사용자 정보 조회 및 검색
- **범위**: 네비게이션 정보, 사용자 검색 (멤버 초대용)
- **비범위**: 프로필 수정 (향후 확장), 아바타 커스터마이징 (GAME.md)

---

<!-- FUNCTIONAL:BEGIN -->

### Contract: USER_API_NAV

- **Tier**: core
- **What**: 사용자 네비게이션 정보 API
- **Rules**:
  | 반환 필드 | 설명 |
  |----------|------|
  | id | 사용자 ID |
  | name | 표시 이름 |
  | email | 이메일 |
  | image | 프로필 이미지 URL |
  | recentSpaces | 최근 방문 공간 (최대 5개) |
- **Evidence**:
  - code: `src/app/api/users/me/nav/route.ts::GET`
  - code: `src/lib/auth.ts::auth`

### Contract: USER_API_SEARCH

- **Tier**: normal
- **What**: 사용자 검색 API (멤버 초대용)
- **Rules**:
  | 파라미터 | 설명 |
  |----------|------|
  | q | 검색어 (이름 또는 이메일) |
  | limit | 결과 개수 (기본 10, 최대 50) |
  | exclude | 제외할 사용자 ID 목록 |
- **Evidence**:
  - code: `src/app/api/users/search/route.ts::GET`
  - code: `prisma/schema.prisma::User`

<!-- FUNCTIONAL:END -->

---

## 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/users/me/nav` | 내 네비게이션 정보 |
| GET | `/api/users/search` | 사용자 검색 |

---

## 참조

- Prisma: `prisma/schema.prisma::User`

---

## 변경 이력

| 날짜 | 요약 | 커밋 |
|------|------|------|
| 2026-01-22 | B등급 보강: 요약 섹션, Tier/Rules 추가, 변경 이력 섹션 추가 | - |
| 2026-01-21 | 초기 작성 (DocOps Phase 2) | - |
