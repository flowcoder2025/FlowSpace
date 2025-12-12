# 멤버 관리 시스템 구현 작업

## 현재 진행: Phase 1 - 데이터 모델 보강

### 요구사항 요약
1. SuperAdmin → OWNER 임명 (복수 OWNER 지원)
2. OWNER 양도 가능
3. 멤버 검색 (이메일 + 공간 내 이름)
4. 전체 멤버 목록 (OWNER/STAFF/PARTICIPANT)
5. 온라인/오프라인 구분 표시

### Phase 순서
1. Phase 1: SpaceMember.displayName 필드 추가
2. Phase 2: API 보강 (전체 멤버 조회, 역할 변경)
3. Phase 3: Dashboard 멤버 관리 UI
4. Phase 4: Space 내부 멤버 패널
5. Phase 5: Socket 온라인 연동

### 수정 파일 목록
- prisma/schema.prisma
- /api/spaces/[id]/members/route.ts
- /src/components/space/MemberList.tsx (신규)
- /src/features/space/components/MemberPanel.tsx (신규)
