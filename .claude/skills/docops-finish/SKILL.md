# /docops-finish - Claude-Native DocOps Completion

> 코드 작업 완료 후 문서 동기화 및 검증을 수행합니다.

## Trigger
```
/docops-finish [--docs-only] [--skip-push] [--verify-soft]
```

## Options

| Option | Description |
|--------|-------------|
| `--docs-only` | 빌드 건너뛰기 (문서만 처리) |
| `--skip-push` | 푸시 건너뛰기 (커밋까지만) |
| `--verify-soft` | soft 모드로 검증 (경고만) |

---

## Claude-Native Workflow (specctl 미사용)

> **목표**: 5분+ → 30초 내 완료

### Step 1: 빌드 (순차, 필수)

```yaml
# --docs-only 아니면 빌드 실행
action: Bash
command: npm run build
on_failure:
  message: "빌드 실패. --docs-only로 문서만 진행할까요?"
  offer: AskUserQuestion with options
```

### Step 2: 변경 감지

```yaml
action: Bash
command: git status --porcelain
analyze:
  - docs/ 변경 여부
  - src/ 변경 여부
  - server/ 변경 여부
```

### Step 3: 병렬 DocOps (Task 동시 실행)

```yaml
parallel_tasks:
  - task_a: "Snapshot 갱신 확인"
    condition: "src/ 또는 server/ 변경 시"
    prompt: |
      코드 변경이 감지되었습니다.
      1. SPEC_SNAPSHOT.md 읽기
      2. 새 라우트/컴포넌트/훅 확인
      3. 변경 필요 시 SPEC_SNAPSHOT.md 갱신 제안

  - task_b: "Verify 로직 실행"
    prompt: |
      /docops-verify 워크플로우와 동일:
      1. Contract 추출
      2. Evidence 검증
      3. 상태 판정
      Return: {sync, missing, hallu, broken, gap}

  - task_c: "Drift 분석"
    prompt: |
      DRIFT_REPORT.md 현재 상태 확인
      새로운 드리프트 감지
      해결된 드리프트 확인
```

### Step 4: 드리프트 처리

```yaml
# verify_level 결정
verify_level:
  default: strict
  "--verify-soft": soft

on_drift_found:
  strict_mode:
    - 드리프트 목록 표시
    - 자동 수정 제안
    - 수정 없이 진행 불가
  soft_mode:
    - 드리프트 경고만
    - 계속 진행 가능

auto_fix_options:
  BROKEN_EVIDENCE:
    - Evidence 경로 수정 시도
    - 파일 이동 감지
  MISSING_DOC:
    - Contract 템플릿 생성 제안
```

### Step 5: 문서 갱신

```yaml
update_files:
  - docs/00_ssot/COVERAGE_MATRIX.md:
      action: Edit
      update: 요약 섹션, 전체 매트릭스

  - docs/00_ssot/DRIFT_REPORT.md:
      action: Edit
      update: Active 섹션, Resolved 섹션
```

### Step 6: Git 작업 (순차)

```yaml
# 1. 변경 파일 확인
action: Bash
command: git status

# 2. docs 파일 스테이징
action: Bash
command: git add docs/00_ssot/COVERAGE_MATRIX.md docs/00_ssot/DRIFT_REPORT.md docs/00_ssot/SPEC_SNAPSHOT.md

# 3. 커밋
action: Bash
command: |
  git commit -m "docs(docops): 문서 동기화 - $(date +%Y-%m-%d)

  - COVERAGE_MATRIX: {sync} SYNC, {missing} MISSING, {broken} BROKEN
  - DRIFT_REPORT: {active_count} active items

  Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"

# 4. 푸시 (--skip-push 아니면)
action: Bash
command: git push
condition: "not --skip-push"
```

---

## SubAgent 지침

```yaml
role: DocOps Finisher (Claude-Native)
tools:
  - Bash (빌드, git 작업)
  - Read (문서 읽기)
  - Edit (문서 갱신)
  - Task (병렬 처리)
  - AskUserQuestion (실패 시 대응 선택)

workflow:
  1. DocOps 적용 확인 (ANCHOR.md 존재?)
  2. (--docs-only 아니면) npm run build
  3. 변경 감지 (git status)
  4. 병렬 Task로 DocOps 검증 (5-10초)
  5. 드리프트 처리
  6. COVERAGE_MATRIX.md, DRIFT_REPORT.md 갱신
  7. Git 커밋 + 푸시

on_build_fail:
  - "빌드 실패. --docs-only로 문서만 진행할까요?"
  - AskUserQuestion 제공

on_verify_fail:
  - DRIFT_REPORT 확인
  - 드리프트 항목 표시
  - "--verify-soft로 경고만 하고 진행할까요?"

performance_target:
  total_time: "30초 이내"
  build_timeout: "2분"
  docops_parallel: "5-10초"
```

---

## 출력 예시

### 성공
```
[DocOps Finish] 워크플로우 시작

[1/6] 빌드 테스트...
  ✓ npm run build 성공

[2/6] 변경 감지...
  ✓ docs/ 변경: 2 files
  ✓ src/ 변경: 3 files

[3/6] DocOps 검증 (병렬)...
  ✓ Snapshot 확인 완료
  ✓ Contract 검증 완료
  ✓ Drift 분석 완료

[4/6] 드리프트 처리...
  ✓ 드리프트 없음

[5/6] 문서 갱신...
  ✓ COVERAGE_MATRIX.md 갱신
  ✓ DRIFT_REPORT.md 갱신

[6/6] Git 작업...
  ✓ git add docs/00_ssot/*.md
  ✓ git commit 완료
  ✓ git push 완료

[DocOps Finish] 완료!
```

### 검증 실패
```
[DocOps Finish] 워크플로우 시작

[1/6] 빌드 테스트...
  ✓ npm run build 성공

[2/6] 변경 감지...
  ✓ docs/ 변경: 1 file
  ✓ src/ 변경: 5 files

[3/6] DocOps 검증 (병렬)...
  ⚠ 새 항목 발견: /api/payments

[4/6] 드리프트 처리...
  ✗ 드리프트 발견 (strict mode)

드리프트 발견:
  - MISSING_DOC: /api/payments (Contract 없음)

선택하세요:
  1. 드리프트 해결 후 재시도
  2. --verify-soft로 경고만 하고 진행
  3. 취소
```

### --docs-only 모드
```
[DocOps Finish] 워크플로우 시작 (docs-only mode)

[1/5] 빌드 테스트...
  ⏭ 스킵 (--docs-only)

[2/5] 변경 감지...
  ✓ docs/ 변경: 2 files

...
```

---

## 사용 시점

```
작업 흐름:
  1. /docops-verify (세션 시작)
  2. 코드 작업...
  3. /docops-finish (작업 완료) ← 여기
```

---

## specctl.ps1과의 관계

| 도구 | 용도 | 환경 |
|------|------|------|
| Claude-Native (이 스킬) | 대화형 세션 | Claude Code |
| specctl.ps1 | CI/CD 자동화 | GitHub Actions |

---

## 참조

- [COVERAGE_MATRIX.md](../../../docs/00_ssot/COVERAGE_MATRIX.md) - 현황판
- [DRIFT_REPORT.md](../../../docs/00_ssot/DRIFT_REPORT.md) - 드리프트 기록
- [SPEC_SNAPSHOT.md](../../../docs/00_ssot/SPEC_SNAPSHOT.md) - 코드 인벤토리
