# /docops-verify - Claude-Native DocOps Verification

> 코드와 문서 간의 드리프트(불일치)를 검증합니다. **세션 시작 시 반드시 실행**하세요.

## Trigger
```
/docops-verify [--level=soft|strict] [--fast] [--fix]
```

## Options

| Option | Description |
|--------|-------------|
| `--level=soft` | 경고만 (기본값) |
| `--level=strict` | 드리프트 시 차단 |
| `--fast` | 심볼 검증 스킵 (빠른 모드) |
| `--fix` | 자동 해결 시도 |

---

## Claude-Native Workflow (specctl 미사용)

> **목표**: 2분+ 타임아웃 → 5-10초 내 완료

### Step 1: DocOps 적용 확인

```yaml
action: Glob
pattern: docs/00_ssot/ANCHOR.md
result:
  exists: "계속 진행"
  not_exists: "DocOps가 적용되지 않았습니다. /docops-init을 먼저 실행하세요."
```

### Step 2: 병렬 데이터 수집 (Task 3개 동시 실행)

```yaml
# 병렬로 3개 Task 실행 (subagent_type: Explore)
parallel_tasks:
  - task_a: "SPEC_SNAPSHOT.md 파싱"
    prompt: |
      Read docs/00_ssot/SPEC_SNAPSHOT.md and extract:
      - All UI routes (Route, File, SPEC_KEY)
      - All API routes (Route, File, SPEC_KEY, Method)
      Return as structured data.

  - task_b: "Contract 추출"
    prompt: |
      Read all files in docs/03_standards/specs/*.md
      Extract all Contracts with format:
      - Contract ID (e.g., SPACE_API_CRUD)
      - Evidence links (code:, ui:, test:)
      Return list of {id, spec_key, evidences[]}.

  - task_c: "Evidence 파일 존재 확인"
    prompt: |
      For each Evidence link from specs, verify file exists using Glob.
      Return list of broken evidences.
```

### Step 3: 상태 판정 (인메모리)

각 Contract에 대해 상태 결정:

```yaml
status_rules:
  SYNC: "코드O, 문서O, 증거O"
  MISSING_DOC: "코드O, 문서X (Snapshot에만 존재) → 드리프트"
  HALLUCINATION: "코드X, 문서O (Contract에만 존재) → 드리프트"
  BROKEN_EVIDENCE: "증거 링크가 깨짐 → 드리프트"
  SNAPSHOT_GAP: "코드X, 문서O (CODE 기반) → 드리프트 (스캔 범위 확장 필요)"
  PROCESS_BASED: "AI_PROTOCOL 등 프로세스 기반 → GAP 제외"
  INFRA_BASED: "INFRA 등 인프라 기반 → GAP 제외"

drift_check:
  - MISSING_DOC > 0: 드리프트
  - HALLUCINATION > 0: 드리프트
  - BROKEN_EVIDENCE > 0: 드리프트
  - SNAPSHOT_GAP > 0: 드리프트 (CODE 기반이면 스캔 범위 확장 필요)
```

### Step 4: 심볼 검증 (--fast 아닐 때만)

```yaml
action: Grep
for_each: BROKEN_EVIDENCE 후보
pattern: "[심볼명]"
paths:
  - code: 경로에서 함수/클래스 이름 검색
result:
  found: SYNC로 변경
  not_found: BROKEN_EVIDENCE 유지
```

### Step 5: MISSING_DOC 감지

```yaml
compare:
  source: SPEC_SNAPSHOT.md 항목
  target: Contract ID 목록
missing: "Snapshot에만 있고 Contract 없는 항목 → MISSING_DOC"
```

### Step 6: 출력 갱신

```yaml
# COVERAGE_MATRIX.md 갱신
update_file: docs/00_ssot/COVERAGE_MATRIX.md
format: |
  ## 요약
  | 항목 | 값 |
  |------|-----|
  | **마지막 검증** | {today} |
  | **검증 레벨** | {level} |
  | **총 항목** | {total} |
  | **SYNC** | {sync_count} |
  | **MISSING_DOC** | {missing_count} |
  | **HALLUCINATION** | {hallu_count} |
  | **BROKEN_EVIDENCE** | {broken_count} |
  | **SNAPSHOT_GAP** | {gap_count} |

# DRIFT_REPORT.md 갱신
update_file: docs/00_ssot/DRIFT_REPORT.md
add_to_active:
  - BROKEN_EVIDENCE 항목
  - MISSING_DOC 항목 (새로 발견된 것만)
  - SNAPSHOT_GAP 항목 (CODE 기반, 스캔 범위 확장 필요)
```

### Step 7: 결과 보고

```yaml
output_format: |
  [DocOps Verify] 검증 레벨: {level}

  검증 결과:
    {status_icon} SYNC: {sync_count}
    {status_icon} MISSING_DOC: {missing_count}
    {status_icon} HALLUCINATION: {hallu_count}
    {status_icon} BROKEN_EVIDENCE: {broken_count}
    {status_icon} SNAPSHOT_GAP: {gap_count}

  {drift_section if any}

  [DocOps Verify] {final_message}

drift_section_format: |
  Active 드리프트:
  | ID | Type | Item | 해결 방법 |
  |----|------|------|----------|
  {drift_rows}

status_icons:
  0: "✓"
  ">0": "✗"

drift_conditions:
  - MISSING_DOC > 0
  - HALLUCINATION > 0
  - BROKEN_EVIDENCE > 0
  - SNAPSHOT_GAP > 0 (CODE 기반만, PROCESS_BASED/INFRA_BASED 제외)
```

---

## SubAgent 지침

```yaml
role: DocOps Verifier (Claude-Native)
tools:
  - Glob (파일 존재 확인)
  - Read (문서 읽기)
  - Grep (심볼 검색)
  - Task (병렬 데이터 수집)
  - Edit (문서 갱신)

workflow:
  1. DocOps 적용 확인 (Glob: ANCHOR.md)
  2. 병렬 Task로 데이터 수집 (3-5초)
  3. 인메모리 상태 판정
  4. (--fast 아니면) 심볼 검증
  5. COVERAGE_MATRIX.md 갱신
  6. DRIFT_REPORT.md 갱신
  7. 결과 보고

on_drift_found:
  - 각 항목별 해결 방법 안내:
    - MISSING_DOC: "Contract 추가 필요"
    - HALLUCINATION: "코드 추가 또는 Contract 삭제"
    - BROKEN_EVIDENCE: "Evidence 링크 수정"
  - --fix 옵션 시 자동 해결 시도

performance_target:
  total_time: "5-10초"
  parallel_tasks: 3
  no_external_scripts: true
```

---

## 출력 예시

### 검증 통과
```
[DocOps Verify] 검증 레벨: soft

검증 결과:
  ✓ SYNC: 66
  ✓ MISSING_DOC: 0
  ✓ HALLUCINATION: 0
  ✓ BROKEN_EVIDENCE: 0
  ⚠ SNAPSHOT_GAP: 62 (자동화 범위 밖)

[DocOps Verify] 드리프트 없음. 작업을 시작하세요.
```

### 드리프트 발견
```
[DocOps Verify] 검증 레벨: soft

검증 결과:
  ✓ SYNC: 63
  ✗ MISSING_DOC: 2
  ✗ HALLUCINATION: 0
  ✗ BROKEN_EVIDENCE: 3
  ⚠ SNAPSHOT_GAP: 62

[DocOps Verify] 드리프트 발견! 먼저 해결이 필요합니다.

Active 드리프트:
| ID | Type | Item | 해결 방법 |
|----|------|------|----------|
| DRIFT-001 | BROKEN_EVIDENCE | DOCOPS_FUNC_SNAPSHOT | Evidence 링크 수정 |
| DRIFT-002 | BROKEN_EVIDENCE | DOCOPS_FUNC_VERIFY | Evidence 링크 수정 |
| DRIFT-003 | MISSING_DOC | /api/new-endpoint | Contract 추가 필요 |

해결하시겠습니까? (/docops-verify --fix)
```

---

## 세션 시작 프로토콜

```
1. /docops-verify 실행
2. 드리프트 있으면 먼저 해결
3. 드리프트 없으면 작업 시작
4. 작업 완료 후 /docops-finish
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
