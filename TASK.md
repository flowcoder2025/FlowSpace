# TASK: 멤버 관리 시스템 전체 구현

> **상태**: ✅ 완료
> **시작일**: 2025-12-12
> **완료일**: 2025-12-12
> **범위**: 전체 구현 (데이터 모델 + API + UI)

---

## 📋 요구사항 요약

### 핵심 기능
1. **SuperAdmin → OWNER 임명** (복수 OWNER 지원)
2. **OWNER 양도** 가능
3. **멤버 검색** (이메일 + 공간 내 이름)
4. **전체 멤버 목록** (OWNER/STAFF/PARTICIPANT)
5. **오프라인/온라인 구분 표시**
6. **3곳의 멤버 UI**:
   - Dashboard 공간 관리 페이지
   - Space 내부 멤버 패널
   - 실제 공간 내 스태프 임명

### 표시 정보
- 구글 계정 (이메일, 프로필 이미지)
- 공간 내 이름 (displayName)
- 역할 (OWNER/STAFF/PARTICIPANT)
- 온라인/오프라인 상태

---

## 📁 Phase 1: 데이터 모델 보강

> **목표**: SpaceMember에 displayName 필드 추가

### 1.1 수정할 파일

| 파일 | 변경 내용 |
|-----|----------|
| `prisma/schema.prisma` | SpaceMember에 displayName 추가 |
| DB 마이그레이션 | `npx prisma db push` |

### 1.2 구현 체크리스트

- [x] SpaceMember.displayName 필드 추가 (nullable)
- [x] Prisma 스키마 업데이트
- [x] DB 마이그레이션 실행

---

## 📁 Phase 2: API 보강

> **목표**: 전체 멤버 조회 + 역할 변경 API

### 2.1 수정/생성할 파일

| 파일 | 변경 내용 |
|-----|----------|
| `/api/spaces/[id]/members/route.ts` | GET: 전체 멤버 조회 (OWNER/STAFF/PARTICIPANT) |
| `/api/spaces/[id]/members/route.ts` | PATCH: 역할 변경 (SuperAdmin→OWNER, OWNER→STAFF) |
| `/api/spaces/[id]/members/[userId]/route.ts` | 🆕 개별 멤버 관리 API |
| `/api/users/search/route.ts` | 이메일 + 이름 검색 보강 |

### 2.2 구현 체크리스트

- [x] GET /api/spaces/[id]/members - 전체 멤버 조회 (역할별 필터)
- [x] PATCH /api/spaces/[id]/members - 역할 변경
- [x] SuperAdmin만 OWNER 임명 가능 검증
- [x] OWNER 복수 지원
- [x] /api/users/search - 이메일 OR 이름 검색

---

## 📁 Phase 3: Dashboard 멤버 관리 UI

> **목표**: /dashboard/spaces/[id] 페이지에 전체 멤버 관리 UI

### 3.1 수정/생성할 파일

| 파일 | 변경 내용 |
|-----|----------|
| `/src/components/space/MemberList.tsx` | 🆕 공용 멤버 목록 컴포넌트 |
| `/src/components/space/MemberSearchInput.tsx` | 🆕 멤버 검색 (이메일/이름) |
| `/src/components/space/RoleBadge.tsx` | 🆕 역할 뱃지 컴포넌트 |
| `/src/app/dashboard/spaces/[id]/page.tsx` | MemberList 통합 |

### 3.2 구현 체크리스트

- [x] MemberList: 역할별 그룹핑 (OWNER/STAFF/PARTICIPANT)
- [x] MemberList: 온라인/오프라인 구분 표시
- [x] MemberSearchInput: 이메일 + 이름 검색
- [x] RoleBadge: 역할별 색상 뱃지
- [x] SuperAdmin용 OWNER 임명 버튼
- [x] OWNER용 STAFF 임명/해제 버튼
- [x] Dashboard 페이지 통합

---

## 📁 Phase 4: Space 내부 멤버 패널

> **목표**: 실제 공간(/space/[id]) 내에서 멤버 표시 및 관리

### 4.1 수정/생성할 파일

| 파일 | 변경 내용 |
|-----|----------|
| `/src/features/space/components/MemberPanel.tsx` | 🆕 공간 내 멤버 패널 |
| `/src/features/space/components/SpaceLayout.tsx` | MemberPanel 통합 |
| `FloatingChatOverlay.tsx` 또는 별도 UI | 스태프 임명 UI |

### 4.2 구현 체크리스트

- [x] MemberPanel: Socket 연동 온라인 상태
- [x] MemberPanel: DB 멤버십 데이터 병합 (MemberList 재사용)
- [x] MemberPanel: 역할 뱃지 + 프로필 표시
- [x] 스태프 임명 UI (OWNER 전용)
- [x] SpaceLayout에 MemberPanel 토글 추가
- [x] ControlBar에 멤버 관리 버튼 추가

---

## 📁 Phase 5: 온라인/오프라인 연동

> **목표**: Socket.io 접속자와 DB 멤버십 병합

### 5.1 수정할 파일

| 파일 | 변경 내용 |
|-----|----------|
| `server/socket-server.ts` | 접속자 목록 브로드캐스트 보강 |
| `/api/spaces/[id]/online/route.ts` | 🆕 현재 접속자 API |
| `useSocket.ts` | 온라인 멤버 목록 상태 |

### 5.2 구현 체크리스트

- [x] Socket: 접속자 userId/playerId 목록 관리 (기존 players Map 활용)
- [x] 프론트: 온라인/오프라인 상태 병합 (onlineUserIds props 전달)
- [ ] API: 현재 온라인 멤버 조회 (선택적 - 현재 Socket 기반 충분)

---

## 📊 진행 상태

| Phase | 상태 | 완료일 |
|-------|------|-------|
| Phase 1: 데이터 모델 | ✅ 완료 | 2025-12-12 |
| Phase 2: API 보강 | ✅ 완료 | 2025-12-12 |
| Phase 3: Dashboard UI | ✅ 완료 | 2025-12-12 |
| Phase 4: Space 내 패널 | ✅ 완료 | 2025-12-12 |
| Phase 5: 온라인 연동 | ✅ 완료 | 2025-12-12 |

---

## 변경 이력

| 날짜 | 내용 |
|-----|------|
| 2025-12-12 | TASK.md 초기화 - 멤버 관리 시스템 전체 구현 계획 |
| 2025-12-12 | Phase 1-5 전체 완료 - 멤버 관리 시스템 구현 완료 |
