# TASK: CLAUDE.md 슬림화 및 DocOps 통합

> **목표**: CLAUDE.md 660줄 → 50줄 슬림화 + 상세 내용 DocOps SPEC 이전
> **시작일**: 2026-01-21
> **근거**: PDF "Claude Code 완전가이드 70가지 팁" - "CLAUDE.md는 간결하게 유지"

---

## 현재 상태

| 항목 | Before | After | 상태 |
|------|:------:|:-----:|:----:|
| CLAUDE.md 줄 수 | 660 | 50 | ✅ |
| 컨텍스트 토큰 | ~19k | ~1k | ✅ |
| DocOps SPEC 연동 | 부분 | 완전 | ✅ |
| 새 Contract 수 | - | +9 | ✅ |

---

## Phase 1: 상세 내용 DocOps SPEC 이전 ✅

> CLAUDE.md의 상세 규칙을 Evidence 기반 Contract로 이전

### P1.1 AI 프로토콜 → AI_PROTOCOL.md (신규)

| 이전 대상 | 원본 위치 | Contract ID |
|----------|----------|-------------|
| 작업 시작 전 계층 구조 확인 | §0.7.1 | AI_PROTOCOL_FUNC_SESSION_START |
| TASK.md 실시간 관리 | §0.7.2 | AI_PROTOCOL_FUNC_TASK_MANAGEMENT |
| 코드-문서 연동 | §0.7.3 | AI_PROTOCOL_FUNC_CODE_DOC_SYNC |
| 검증 프로세스 | §0.7.4 | AI_PROTOCOL_FUNC_VERIFICATION |

- [x] AI_PROTOCOL.md 생성
- [x] 6개 Contract 작성 (Evidence 포함)

### P1.2 버튼 규칙 → UI_COMPONENT.md (기존 업데이트)

| 이전 대상 | 원본 위치 | Contract ID |
|----------|----------|-------------|
| 버튼 variant 제한 | §4.2 | UI_COMPONENT_DESIGN_BUTTON (기존) |
| Hover 스타일 규칙 | §4.2 | UI_COMPONENT_DESIGN_BUTTON_HOVER (신규) |

- [x] UI_COMPONENT.md에 Hover 규칙 추가

### P1.3 접근성 → FOUNDATION.md (기존 업데이트)

| 이전 대상 | 원본 위치 | Contract ID |
|----------|----------|-------------|
| 모달 접근성 상세 | §4.5 | FOUNDATION_DESIGN_A11Y_MODAL (신규) |
| 상태도 작성 규칙 | §4.5 | FOUNDATION_DESIGN_STATE_MACHINE (신규) |

- [x] FOUNDATION.md에 모달 접근성 Contract 추가

### P1.4 완료 기준

- [x] 3개 SPEC 파일 업데이트/생성
- [x] 9개 Contract 추가 완료

---

## Phase 2: CLAUDE.md 슬림화 ✅

> 660줄 → 50줄로 축소, 핵심 원칙만 유지

### P2.1 유지할 내용 (핵심)

```markdown
# FlowSpace
> ZEP-감성 2D 메타버스 | Next.js 15 + Phaser 3 + Socket.io + LiveKit

## 핵심 원칙
- Primary Color만 바꾸면 브랜드 완성 (CSS Variables 필수)
- Button: `default`, `outline`만 사용
- 한글 하드코딩 금지 → text-config.ts 사용

## 금지 사항 (DO NOT)
- 색상 하드코딩, SQL 직접 쿼리, 시크릿 노출, variant 추가

## 개발 서버
`npm run dev:all` (3000, 3001, 7880)

## 네비게이터 (상세 규칙 참조)
| 작업 유형 | 참조 |
|----------|------|
| AI 프로토콜 | docs/03_standards/specs/AI_PROTOCOL.md |
| UI 규칙 | docs/03_standards/specs/UI_COMPONENT.md |
| 접근성 | docs/03_standards/specs/FOUNDATION.md |

## DocOps
세션 시작: `/docops-verify` | 완료: `/docops-finish`
```

### P2.2 삭제할 내용

- [x] §0.5-0.7 TASK.md/AI 프로토콜 상세 (→ AI_PROTOCOL.md)
- [x] §3 디렉토리 구조 상세 (→ ARCH.md Evidence)
- [x] §4.2 버튼 상세 (→ UI_COMPONENT.md)
- [x] §4.5 접근성 상세 (→ FOUNDATION.md)
- [x] §5-6 개발 프로세스/문서 정책 (→ DOC_POLICY.md)
- [x] 변경 이력 (→ docs/changes/)

### P2.3 완료 기준

- [x] CLAUDE.md 50줄 이내 (정확히 50줄)
- [x] 모든 상세 내용이 DocOps SPEC에 존재

---

## Phase 3: 검증 및 마무리 ⏳

### P3.1 검증

- [x] COVERAGE_MATRIX.md 업데이트 (+9 Contract)
- [ ] git add .
- [ ] git commit
- [ ] git push

---

## 진행 상태

| Phase | 설명 | 상태 | 완료일 |
|-------|------|:----:|:------:|
| Phase 1 | DocOps SPEC 이전 | ✅ 완료 | 2026-01-21 |
| Phase 2 | CLAUDE.md 슬림화 | ✅ 완료 | 2026-01-21 |
| Phase 3 | 검증 및 마무리 | ⏳ 진행중 | - |

---

## 참조

- 분석 근거: `docs/00_ssot/HANDOFF_2026-01-21_CLAUDE_SLIM.md`
- DocOps 스펙: `docs/00_ssot/DOCOPS_SPEC_V3.2.md`
- 기존 SPEC: `docs/03_standards/specs/*.md`

---

## 변경 이력

| 날짜 | 변경 내용 |
|-----|----------|
| 2026-01-21 | TASK.md 초기화 - CLAUDE.md 슬림화 태스크 시작 |
