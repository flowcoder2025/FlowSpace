# TASK: 멤버 관리 시스템 통합 및 SSOT 준수

> **상태**: 🔄 진행 중
> **시작일**: 2025-12-15
> **범위**: MemberManagement 컴포넌트 통합, OWNER 권한 UI, SSOT 준수

---

## 🎯 목표

### 핵심 요구사항
1. **OWNER 권한 변경 UI** - SuperAdmin만 OWNER 권한 변경 가능
2. **컴포넌트 통합** - StaffManagement 기능을 MemberManagement에 흡수
3. **SSOT 준수** - dashboard/admin/space 내부 동일한 멤버 관리 로직
4. **오프라인 멤버 수 정확도** - 등록 멤버 중 온라인 아닌 사용자 카운트

### 권한 체계
| 동작 | 권한 |
|-----|------|
| OWNER → STAFF 강등 | SuperAdmin만 |
| STAFF → OWNER 승격 | SuperAdmin만 |
| STAFF → PARTICIPANT 강등 | OWNER, SuperAdmin |
| PARTICIPANT → STAFF 승격 | OWNER, SuperAdmin |
| 멤버 추가 | OWNER, SuperAdmin |
| 멤버 제거 | OWNER, SuperAdmin (OWNER 제외) |

### 제약 조건
- 게스트 없음: 로그인 필수
- 1회 입장 시 자동 멤버(PARTICIPANT) 등록

---

## 📁 Phase 1: MemberManagement 컴포넌트 통합

> **목표**: StaffManagement 기능을 MemberManagement에 흡수

### 1.1 대상 파일

| 파일 | 작업 |
|-----|------|
| `src/components/space/MemberManagement.tsx` | 멤버 추가 기능 추가, OWNER 권한 변경 UI |
| `src/components/space/StaffManagement.tsx` | 삭제 (기능 통합 완료 후) |

### 1.2 구현 체크리스트

- [ ] MemberSearchInput 통합 (멤버 추가 기능)
- [ ] OWNER 권한 변경 드롭다운 추가 (SuperAdmin 전용)
- [ ] 역할 변경 로직 MemberList.tsx 참조하여 통일
- [ ] 오프라인 멤버 수 계산 로직 수정 (전체 멤버 - 온라인)
- [ ] X 버튼 OWNER 예외 처리 (삭제 대신 권한 변경 안내)

### 1.3 참조 코드 (MemberList.tsx 패턴)

```tsx
// OWNER → STAFF 강등 (SuperAdmin만)
{member.role === "OWNER" && isSuperAdmin && (
  <Button onClick={() => handleChangeRole(member.userId!, "STAFF")}>
    STAFF로
  </Button>
)}

// STAFF/PARTICIPANT 권한 변경 (OWNER 또는 SuperAdmin)
{member.role !== "OWNER" && (isOwner || isSuperAdmin) && (
  <select onChange={(e) => handleChangeRole(member.userId!, e.target.value)}>
    <option value="STAFF">STAFF</option>
    <option value="PARTICIPANT">PARTICIPANT</option>
  </select>
)}
```

---

## 📁 Phase 2: dashboard/spaces/[id] 수정

> **목표**: StaffManagement 제거, MemberManagement로 통합

### 2.1 대상 파일

| 파일 | 작업 |
|-----|------|
| `src/app/dashboard/spaces/[id]/page.tsx` | StaffManagement 제거, MemberManagement 사용 |

### 2.2 구현 체크리스트

- [ ] StaffManagement import 제거
- [ ] StaffManagement 컴포넌트 사용 부분 제거
- [ ] MemberManagement에 isSuperAdmin prop 전달
- [ ] 중복 멤버 관리 섹션 정리

---

## 📁 Phase 3: admin/spaces/[id] SSOT 수정

> **목표**: admin도 동일한 MemberManagement 사용

### 3.1 대상 파일

| 파일 | 작업 |
|-----|------|
| `src/app/admin/spaces/[id]/page.tsx` | MemberManagement에 isSuperAdmin=true 전달 |

### 3.2 구현 체크리스트

- [ ] isSuperAdmin prop 전달
- [ ] OWNER 권한 변경 UI 동작 확인
- [ ] 멤버 추가 기능 동작 확인

---

## 📁 Phase 4: 공간 내부 MemberPanel SSOT 적용

> **목표**: 공간 내부 멤버 패널도 동일한 권한 체계 적용

### 4.1 대상 파일

| 파일 | 작업 |
|-----|------|
| `src/features/space/components/MemberList.tsx` | 기준 구현 확인 (현재 올바름) |
| `src/features/space/components/MemberPanel.tsx` | isSuperAdmin prop 전달 확인 |

### 4.2 구현 체크리스트

- [ ] MemberList와 MemberManagement 권한 로직 일치 확인
- [ ] SuperAdmin 판별 로직 동일하게 적용

---

## 📁 Phase 5: 자동 멤버 등록 로직 확인

> **목표**: 공간 입장 시 자동 PARTICIPANT 등록 확인

### 5.1 대상 파일

| 파일 | 작업 |
|-----|------|
| `src/app/space/[id]/page.tsx` | 자동 멤버 등록 로직 확인 |
| `src/app/api/spaces/[id]/visit/route.ts` | 방문 시 멤버 생성 API |

### 5.2 구현 체크리스트

- [ ] 로그인 사용자 공간 입장 시 SpaceMember 자동 생성 확인
- [ ] 이미 멤버인 경우 중복 생성 방지 확인
- [ ] 게스트 세션 코드 정리 (필요시)

---

## 📁 Phase 6: StaffManagement 파일 정리

> **목표**: 통합 완료 후 레거시 코드 제거

### 6.1 대상 파일

| 파일 | 작업 |
|-----|------|
| `src/components/space/StaffManagement.tsx` | 삭제 |
| `src/components/space/index.ts` | export 정리 |

### 6.2 구현 체크리스트

- [ ] StaffManagement 사용처 모두 제거 확인
- [ ] 파일 삭제
- [ ] index.ts export 정리

---

## 📊 진행 상태

| Phase | 상태 | 완료일 |
|-------|------|--------|
| Phase 1: MemberManagement 통합 | ✅ 완료 | 2025-12-15 |
| Phase 2: dashboard/spaces 수정 | ✅ 완료 | 2025-12-15 |
| Phase 3: admin/spaces SSOT 수정 | ✅ 완료 | 2025-12-15 |
| Phase 4: MemberPanel SSOT 적용 | ✅ 완료 | 2025-12-15 |
| Phase 5: 자동 멤버 등록 확인 | ✅ 완료 | 2025-12-15 |
| Phase 6: StaffManagement 정리 | ✅ 완료 | 2025-12-15 |

---

## 🔗 관련 파일 참조

### 핵심 파일
- `src/components/space/MemberManagement.tsx` - 통합 대상
- `src/components/space/StaffManagement.tsx` - 삭제 예정
- `src/features/space/components/MemberList.tsx` - 참조 구현 (올바른 패턴)
- `src/features/space/components/MemberPanel.tsx` - 공간 내부 멤버 패널

### API
- `src/app/api/spaces/[id]/members/route.ts` - 멤버 CRUD API
- `src/app/api/spaces/[id]/visit/route.ts` - 방문 시 자동 멤버 등록

### 페이지
- `src/app/dashboard/spaces/[id]/page.tsx` - OWNER/STAFF 관리 페이지
- `src/app/admin/spaces/[id]/page.tsx` - SuperAdmin 관리 페이지

---

## 변경 이력

| 날짜 | 내용 |
|-----|------|
| 2025-12-15 | TASK.md 초기화 - 멤버 관리 시스템 통합 계획 수립 |
| 2025-12-15 | 모든 Phase 완료 - StaffManagement 삭제, MemberManagement 통합 |
