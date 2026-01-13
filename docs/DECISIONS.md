# Decisions Log

> 아키텍처 및 운영 의사결정 기록

---

## 결정 기록

### DEC-001: CLAUDE.md 계층 구조 종료 및 docs/03_ops 전환

**날짜**: 2026-01-13

**Context**:
FlowSubAgent 통합 후, 기존 프로젝트의 분산된 claude.md 파일(src/, server/ 하위)과 새로운 서브에이전트 시스템 간 충돌 가능성 존재. 단일 진입점(ANCHOR.md)으로 수렴하는 구조 필요.

**Options**:
1. 기존 claude.md 계층 유지 + FlowSubAgent 병행 → 혼란 가능성
2. 레거시 claude.md를 legacy 폴더로 봉인 + ANCHOR.md 단일 진입점 → 명확한 SSOT
3. 모든 claude.md 삭제 → 기존 참조 손실

**Decision**:
Option 2 - 레거시 claude.md를 `docs/04_reference/legacy_claude_md/`로 마이그레이션하고, `docs/03_ops/ANCHOR.md`를 단일 진입점으로 설정

**Evidence**:
- 마이그레이션 대상: 5개 파일 (server, src/components, src/features, src/features/space, src/lib)
- 커밋: ULW-003에서 실행
- 검증: 원 위치 0개, legacy 폴더 5개 확인

**Consequences**:
- 장점: 단일 SSOT로 수렴, 서브에이전트 시스템과 충돌 없음
- 단점: 기존 습관대로 하위 claude.md 참조 시 혼란 가능 (교육 필요)
- 완화: README.md에 "운영 SSOT 아님" 명시, ANCHOR.md 참조 유도

---

### DEC-002: ULW 모드(10-step) 및 Soft Gate 규칙 확립

**날짜**: 2026-01-13

**Context**:
FlowSubAgent Pro 프로파일(11개 에이전트) 도입 시, 모든 작업에 대해 일관된 품질 게이트 필요. 단, Codex 검증 실패 시에도 작업 진행이 가능해야 하는 유연성 요구.

**Options**:
1. Hard Gate - codex-verifier FAIL 시 커밋 블로킹 → 개발 속도 저하
2. Soft Gate - codex-verifier UNCERTAIN 허용, 경고 출력 후 진행 → 유연성 + 추적성
3. No Gate - 검증 없이 진행 → 품질 저하

**Decision**:
Option 2 - Soft Gate 방식 채택. pre-push 훅에서 10초 대기 후 자동 진행, DECISIONS.md/RESUME_PACK.md에 PASS 기록 없을 시 경고만 출력

**Evidence**:
- `.claude/hooks/pre-push.sh`: 10초 대기 후 진행 로직
- RUN_LOG 기록: RUN(UNCERTAIN) 상태 허용
- ULW-001, ULW-002에서 Soft Gate 작동 확인

**Consequences**:
- 장점: 개발 속도 유지, 품질 추적 가능
- 단점: UNCERTAIN 상태 누적 시 기술 부채 가능
- 완화: codex-verifier 정기 실행으로 PASS 획득, SPEC_SNAPSHOT 갱신

---

## 검증 이력

| 날짜 | Decision ID | Verdict | 검증자 | 비고 |
|------|-------------|---------|--------|------|
| 2026-01-13 | DEC-001 | PASS | verifier | 레거시 5개 마이그레이션 완료, 원위치 0개 확인 |
| 2026-01-13 | DEC-002 | PASS | verifier | Soft Gate 작동 확인 (ULW-001~003) |

---

## 관련 문서

- [ANCHOR.md](03_ops/ANCHOR.md) - 세션 시작 진입점
- [AGENTS.md](03_ops/AGENTS.md) - 에이전트 역할 정의
- [RUN_LOG.md](03_ops/RUN_LOG.md) - ULW 실행 기록
- [SPEC_SNAPSHOT.md](03_ops/SPEC_SNAPSHOT.md) - PRD 스냅샷
