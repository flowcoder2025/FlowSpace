# USER - 사용자 API 스펙

> 사용자 프로필 및 검색 API

---

## 개요

사용자 정보 조회, 검색, 네비게이션 데이터 API

---

<!-- FUNCTIONAL:BEGIN -->

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

> **생성일**: 2026-01-21 DocOps Phase 2
