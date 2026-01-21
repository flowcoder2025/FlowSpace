# DASHBOARD - 대시보드 API 스펙

> 공간 OWNER/STAFF용 대시보드 API

---

## 개요

공간별 통계 조회 및 데이터 내보내기 API

---

<!-- FUNCTIONAL:BEGIN -->

### Contract: DASHBOARD_API_STATS

- **What**: 공간별 통계 조회 API
- **Evidence**:
  - code: `src/app/api/dashboard/spaces/[id]/stats/route.ts::GET`
  - code: `src/lib/space-auth.ts::canManageSpace`

### Contract: DASHBOARD_API_EXPORT

- **What**: 공간 데이터 내보내기 API
- **Evidence**:
  - code: `src/app/api/dashboard/spaces/[id]/export/route.ts::GET`
  - code: `src/lib/space-permissions.ts::hasPermission`

<!-- FUNCTIONAL:END -->

---

## 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/dashboard/spaces/[id]/stats` | 공간 통계 |
| GET | `/api/dashboard/spaces/[id]/export` | 데이터 내보내기 |

---

## 권한

- **OWNER/STAFF** 이상 역할 필요
- 또는 **SuperAdmin** 권한

---

> **생성일**: 2026-01-21 DocOps Phase 2
