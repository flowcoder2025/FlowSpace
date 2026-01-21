# AI_PROTOCOL

> AI 어시스턴트 작업 프로토콜 - 세션/태스크/검증 규칙

---

## 0. 요약

- **목적**: AI 어시스턴트(Claude)가 FlowSpace 프로젝트 작업 시 따라야 하는 프로토콜
- **범위**: 세션 시작, TASK.md 관리, 코드-문서 연동, 검증 프로세스
- **비범위**: 코드 스타일 가이드 (→ FOUNDATION.md), UI 규칙 (→ UI_COMPONENT.md)

---

## 1. 기능 요소 (Functional)

<!-- FUNCTIONAL:BEGIN -->

### Contract: AI_PROTOCOL_FUNC_SESSION_START
- **Tier**: core
- **What**: 작업 시작 전 계층 구조 확인 프로토콜
- **Inputs/Outputs**:
  - Input: 사용자 작업 요청
  - Output: 컨텍스트 로드 완료 상태
- **Flow**:
  ```
  작업 요청 수신
      ↓
  1. /CLAUDE.md 확인 (루트 헌법)
      ↓
  2. 작업 영역 claude.md 확인
      ↓
  3. /docs 관련 문서 확인
      ↓
  4. /TASK.md 확인 (미완료 항목)
      ↓
  작업 시작
  ```
- **Evidence**:
  - code: `CLAUDE.md::FlowSpace`
  - code: `docs/00_ssot/ANCHOR.md::ANCHOR`

### Contract: AI_PROTOCOL_FUNC_TASK_MANAGEMENT
- **Tier**: core
- **What**: TASK.md 실시간 관리 프로토콜
- **Inputs/Outputs**:
  - Input: 태스크 상태 변경 이벤트
  - Output: TASK.md 업데이트
- **Rules**:
  | 상황 | 절차 |
  |-----|------|
  | 이전 TASK 완료됨 | 피드백 받기 → 반영 → 초기화 |
  | 이전 TASK 미완료 | 미완료 파악 → 보고 → 진행 |
  | 새 태스크 시작 | 계획 작성 → 실시간 업데이트 |
- **생성 조건**:
  | 상황 | TASK.md 필요 |
  |-----|:------------:|
  | 단순 버그 수정 | ❌ |
  | 단일 파일 수정 | ❌ |
  | 3개+ 파일 수정 | ⚠️ 권장 |
  | 새 기능 추가 | ✅ 필수 |
  | 복잡한 리팩토링 | ✅ 필수 |
- **Evidence**:
  - code: `TASK.md::TASK`

### Contract: AI_PROTOCOL_FUNC_CODE_DOC_SYNC
- **Tier**: normal
- **What**: 코드 변경 시 문서 업데이트 연동
- **Rules**:
  | 코드 변경 유형 | 문서 업데이트 대상 |
  |--------------|------------------|
  | 새 API 추가 | 해당 SPEC.md, claude.md |
  | 기능 완료 | ROADMAP.md 상태 |
  | 버그 수정 | TASK.md |
  | 아키텍처 변경 | ARCH.md |
- **Evidence**:
  - code: `docs/00_ssot/DOC_POLICY.md::DOC_POLICY`

### Contract: AI_PROTOCOL_FUNC_VERIFICATION
- **Tier**: core
- **What**: 구현 완료 후 검증 프로세스
- **Flow**:
  ```
  구현 완료
      ↓
  1. npx tsc --noEmit (타입체크)
      ↓
  2. npm run build (빌드)
      ↓
  3. 관련 문서 업데이트
      ↓
  4. git commit & push
      ↓
  완료 보고
  ```
- **Errors**:
  - `TYPE_ERROR`: 타입 에러 → 코드 수정 후 재검증
  - `BUILD_ERROR`: 빌드 에러 → 원인 파악 → 수정
  - `UNRESOLVED`: 해결 불가 → 사용자 보고
- **Evidence**:
  - code: `package.json::scripts`

<!-- FUNCTIONAL:END -->

---

## 2. 디자인 요소 (Design / UX·UI)

<!-- DESIGN:BEGIN -->

### Contract: AI_PROTOCOL_DESIGN_TASK_STRUCTURE
- **Tier**: normal
- **What**: TASK.md 문서 구조 템플릿
- **Template**:
  ```markdown
  # TASK: [태스크 제목]

  > **목표**: [한 줄 설명]
  > **시작일**: YYYY-MM-DD

  ## 현재 상태
  | 상태 | 수량 | 설명 |

  ## Phase 1: [단계명]
  - [ ] 체크리스트 항목

  ## 진행 상태
  | Phase | 설명 | 상태 | 완료일 |

  ## 참조
  - HANDOFF: docs/00_ssot/HANDOFF_*.md

  ## 변경 이력
  | 날짜 | 변경 내용 |
  ```
- **Evidence**:
  - code: `TASK.md::TASK`

### Contract: AI_PROTOCOL_DESIGN_HANDOFF_STRUCTURE
- **Tier**: normal
- **What**: HANDOFF 문서 구조 (세션 간 컨텍스트 전달)
- **Template**:
  ```markdown
  # HANDOFF - [작업명]

  > **세션 핸드오프 문서**
  > **작성일**: YYYY-MM-DD
  > **상태**: ⏳ 진행중 | ✅ 완료

  ## 1. 배경
  ## 2. 완료된 작업
  ## 3. 다음 작업
  ## 4. 파일 위치 요약
  ```
- **Evidence**:
  - code: `docs/00_ssot/HANDOFF_2026-01-21_CLAUDE_SLIM.md::HANDOFF`

<!-- DESIGN:END -->

---

## 3. Implementation Notes

### 3.1 DocOps 연동

- 세션 시작: `/docops-verify` 실행
- 작업 완료: `/docops-finish` 실행
- 상세 스펙: `docs/00_ssot/DOCOPS_SPEC_V3.2.md`

### 3.2 컨텍스트 효율

- CLAUDE.md는 간결하게 유지 (~50줄)
- 상세 규칙은 DocOps SPEC으로 분리
- HANDOFF 문서로 세션 간 컨텍스트 전달

---

## 4. 변경 이력

| 날짜 | 요약 | 커밋 |
|------|------|------|
| 2026-01-21 | 초기 작성 - CLAUDE.md §0.7에서 이전 | - |
