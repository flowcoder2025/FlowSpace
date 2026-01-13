# SPEC_SNAPSHOT - SSOT 스냅샷

> 현재 시점의 SSOT(PRD/AGENTS/Policy) 핵심 요약 스냅샷

## 메타데이터

| 항목 | 값 |
|------|-----|
| **Snapshot Date** | 2026-01-13 |
| **PRD Version** | 1.0 |
| **Profile** | Pro |
| **Owner** | Claude (git author) |
| **Last Verifier** | codex-verifier |
| **Status** | PASS |
| **Last Verdict Commit** | ff54814 |

### Status 정의

| Status | 의미 |
|--------|------|
| **PASS** | 마지막 codex-verifier Verdict=PASS 근거 존재 |
| **FAIL** | 마지막 codex-verifier Verdict=FAIL |
| **UNKNOWN** | codex-verifier 미실행 또는 근거 없음 |

**Last Verdict Evidence Location**: `docs/DECISIONS.md`

근거 형식:
```
codex-verifier: PASS|FAIL (commit <hash>) (evidence: <link/path>)
```

---

## PRD 핵심 요약

### 프로젝트 목적
Claude Code용 Sisyphus 스타일 서브에이전트 오케스트레이션 템플릿

### 핵심 기능 (Feature IDs)
| ID | 기능 | 상태 |
|----|------|------|
| F-CORE-001 | Core 프로파일 (4 에이전트) | ✅ 완료 |
| F-PRO-001 | Pro 프로파일 (11 에이전트) | ✅ 완료 |
| F-HOOK-001 | Git hooks (pre-commit, commit-msg, pre-push) | ✅ 완료 |
| F-MIGRATE-001 | 레거시 claude.md 마이그레이션 | ✅ 완료 |
| F-ENT-001 | Enterprise: docs-scan | ✅ 완료 |

### 완료 조건
1. codex-verifier: **PASS**
2. doc-manager: 문서 반영 완료
3. context-keeper: RESUME_PACK.md 갱신

---

## 에이전트 요약

### Core (4개)
- doc-manager: 문서 관리 (PRD Sync)
- codex-verifier: 최종 PASS/FAIL 판정
- runner: typecheck/test/build 실행
- verifier: 근거 수집 (판정 금지)

### Pro (7개 추가)
- explore: 빠른 탐색 (haiku)
- librarian: 근거 수집/요약
- implementer: 코드 구현 (**Write 전담**)
- context-keeper: Resume Pack 갱신
- security-license: 보안/라이선스 스캔
- spec-acceptance: AC 초안 작성
- main-orchestrator: 플레이북/체크리스트

---

## 정책 요약

### 커밋 메시지
```
<TAG>: <한국어 요약>
```
TAG: F-XXX, BUG-XXX, REFACTOR, CHORE, DOCS, OPS

### 문서 정책 (Overlay)
- **Write 허용**: docs/03_ops/**, docs/04_reference/**, PRD.md
- **Read-only**: 기존 레거시 docs/**

### 참조 수렴
- 세션 시작 → ANCHOR.md → 각 SSOT 문서

---

## 변경 이력

| 날짜 | 변경 내용 | 담당 |
|------|----------|------|
| 2026-01-13 | 초기 스냅샷 생성 (Pro Pack v1.0) | Claude |

---

## 갱신 규칙

### 갱신 시점
- 주요 기능 완료 (Feature ID 추가/변경)
- 릴리즈 태그 생성 전
- codex-verifier PASS 획득 후

### 갱신 항목별 규칙

| 항목 | 갱신 규칙 | 담당 |
|------|----------|------|
| **Snapshot Date** | 갱신 시점 날짜 (YYYY-MM-DD) | doc-manager |
| **PRD Version** | PRD.md의 Version 필드와 동기화 | doc-manager |
| **Owner** | `git log -1 --format='%an'` (마지막 커밋 author) | 자동 |
| **Status** | codex-verifier Verdict 결과 (PASS/FAIL/UNKNOWN) | codex-verifier 후 |

### 갱신 담당
- **doc-manager**: PRD 변경 시 동기화
- **context-keeper**: 세션 종료 시 Resume Pack과 함께 갱신
