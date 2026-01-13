# Resume Pack

> 세션 종료 시 context-keeper가 갱신하는 컨텍스트 보존 문서

## 현재 상태

**FlowSubAgent 통합 완료** (2026-01-13)
- Profile: **pro** (11개 에이전트)
- Tier: **high** (풀옵션)
- Codex: **ON** (로그인 완료)
- Git Hooks: 설정됨 (pre-commit, commit-msg, pre-push)

### 운영 중인 프로젝트: FlowSpace
- ZEP-감성 2D 메타버스 플랫폼
- 기술스택: Next.js 15 + Phaser 3 + Socket.io + LiveKit
- 배포: Vercel (웹) + OCI (Socket.io, LiveKit)

## 결정사항 + 근거

| 결정 | 근거 |
|------|------|
| Pro 프로파일 사용 | 복잡한 프로젝트에 11개 에이전트 필요 |
| High 티어 | 품질 우선, Opus 모델 활용 |
| Codex ON | 최종 검증 자동화 |
| 기존 CLAUDE.md 유지 | FlowSpace 전용 규칙 보존, 섹션 9에 서브에이전트 추가 |

## 남은 TODO (우선순위)

### P0: 즉시 필요 ✅ 완료
1. [x] **SPEC_SNAPSHOT.md 초기화** - 현재 PRD 상태 스냅샷 (2026-01-13)
2. [x] **DRIFT_REPORT.md 초기화** - PRD↔코드 드리프트 추적 시작 (2026-01-13)
3. [x] **package.json에 typecheck/test 스크립트 추가** - Git hooks 정상 작동 (2026-01-13)

### P1: 다음 세션 ✅ 완료
4. [x] **레거시 claude.md 마이그레이션** - 5개 파일 → legacy_claude_md/ (2026-01-13)
5. [x] **DECISIONS.md 초기화** - DEC-001/002 기록 완료 (2026-01-13)

### P2: 선택
6. [ ] **CI Gate 연동** - codex-verifier PASS 시 자동 배포
7. [ ] **test 스크립트 구현** - Jest/Vitest 설정

## 재현/실행 커맨드

```bash
# 상태 확인
./scripts/flow status

# ULW 모드 실행 예시
<명령> ulw

# 프리셋 변경
./scripts/flow preset high

# 프로파일 확인
./scripts/install.sh --status
```

## 위험/불확실 (근거)

| 항목 | 위험도 | 설명 |
|------|--------|------|
| test 스크립트 없음 | MEDIUM | pre-commit hook에서 placeholder 사용 (echo + exit 0) |
| ~~레거시 claude.md 존재~~ | ~~LOW~~ | ✅ 해결됨 - 5개 파일 legacy_claude_md/로 마이그레이션 완료 |
| Codex 토큰 만료 | LOW | 주기적으로 `codex login` 필요 |

## 검증 상태

- **Verdict**: PASS (P0+P1 완료)
- **Last verified**: 2026-01-13
- **Completed**: P0 3개 + P1 2개 = 5개 작업 완료
- **DECISIONS.md**: DEC-001/002 기록됨
- **Next action**: P2 선택 작업 또는 기능 개발 진행
