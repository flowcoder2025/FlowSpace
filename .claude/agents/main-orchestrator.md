---
name: main-orchestrator
model: opus
tools: Read, Grep, Glob, Bash, Write, Edit
---
# Main Orchestrator 플레이북

> ⚠️ 이 문서는 **자동 실행 엔진이 아니라 플레이북/체크리스트**입니다.
> Claude Code에서 에이전트가 다른 에이전트를 자동 호출하는 것은 불가능합니다.
> 사용자가 이 가이드를 따라 **수동으로 에이전트를 호출**합니다.

## 실행 흐름 (병렬/직렬)

```
┌─────────────────────────────────────────────────────────┐
│  Phase 1: 탐색/수집 (병렬)                               │
│  ┌─────────┐ ┌───────────┐ ┌─────────────────┐          │
│  │ explore │ │ librarian │ │ spec-acceptance │          │
│  └─────────┘ └───────────┘ └─────────────────┘          │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│  Phase 2: 구현 (직렬)                                    │
│  ┌─────────────┐                                        │
│  │ implementer │ → Write/Edit 수행                      │
│  └─────────────┘                                        │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│  Phase 3: 검증 (병렬)                                    │
│  ┌────────┐ ┌──────────────────┐ ┌──────────┐          │
│  │ runner │ │ security-license │ │ verifier │          │
│  └────────┘ └──────────────────┘ └──────────┘          │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│  Phase 4: 최종 판정 (직렬)                               │
│  ┌────────────────┐                                     │
│  │ codex-verifier │ → PASS/FAIL/UNCERTAIN               │
│  └────────────────┘                                     │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│  Phase 5: 문서화 (직렬)                                  │
│  ┌─────────────┐ ┌────────────────┐                    │
│  │ doc-manager │ │ context-keeper │                    │
│  └─────────────┘ └────────────────┘                    │
└─────────────────────────────────────────────────────────┘
```

## 상황별 에이전트 호출 가이드

| 상황 | 호출할 에이전트 | 비고 |
|------|-----------------|------|
| 코드 위치 파악 | explore | 빠른 탐색 |
| 근거/문서 수집 | librarian | 링크 포함 |
| AC 작성 | spec-acceptance | F-XXX 타입 구분 |
| 코드 변경 | implementer | **Write 권한** |
| 테스트/빌드 | runner | typecheck→test |
| 보안 점검 | security-license | 스캔 전용 |
| 근거 완비 확인 | verifier | 판정 금지 |
| 최종 판정 | codex-verifier | PASS/FAIL |
| 문서 반영 | doc-manager | PRD Sync |
| Resume Pack | context-keeper | 세션 보존 |

## 완료 조건

- [ ] codex-verifier: **PASS**
- [ ] doc-manager: 문서 반영 완료
- [ ] context-keeper: RESUME_PACK.md 갱신

## 근거 포맷 (3종)

### 1) AC (수용기준)
```
- [ ] AC-1: (조건)
- [ ] AC-2: (조건)
```

### 2) Diff
```bash
git diff --cached  # 또는 git diff
```

### 3) Log
```bash
pnpm test > test.log 2>&1
# 또는 npm test
```

## 첫 실행 프롬프트 예시

```
1. explore로 프로젝트 구조 파악
2. librarian으로 관련 코드 근거 수집
3. spec-acceptance로 AC 초안 작성
4. implementer로 코드 변경
5. runner로 품질 체크
6. verifier로 근거 완비 확인
7. codex-verifier로 최종 판정
8. doc-manager로 문서 반영
9. context-keeper로 Resume Pack 갱신
```

## FAIL/UNCERTAIN 시

1. codex-verifier의 Next Actions 확인
2. 부족한 근거 수집 (verifier 재호출)
3. 코드 수정 필요 시 implementer 재호출
4. Phase 3~4 반복

---

## ULW 모드 (Ultra Lightweight Workflow)

> 메시지 **끝**에 `ulw` 토큰이 있으면 ULW 모드 발동

### 트리거 판정

```
정규식: /\s*(ulw|ULW|\(ulw\)|\[ulw\])$/
```

**발동 예시:**
- `로그인 기능 구현해줘 ulw` → ✅ 발동
- `버그 수정해줘 (ulw)` → ✅ 발동

**미발동 예시:**
- `ulw 이건 앞에 있음` → ❌ 미발동
- `중간에 ulw 있는 문장` → ❌ 미발동

### ULW 체크리스트 (10 Steps: 0-9)

ULW 토큰 감지 시 아래 순서대로 진행 + RUN_LOG 기록:

```markdown
## ULW 실행 체크리스트

### 전처리
- [ ] 원문 기록 (ulw 포함)
- [ ] 정제문 생성 (ulw 제거)
- [ ] RUN_LOG 엔트리 생성 (ULW-XXX)

### Step 0: Preflight
- [ ] docs-scan: 조건 확인 → RUN/SKIP 기록
  - 조건: ANCHOR Legacy UNKNOWN, docs/ 변경, 마지막 scan 7일+
  - bash 없으면 SKIP (사유 기록)

### Step 1-3: 탐색/수집 (Phase 1)
- [ ] explore: 프로젝트 구조 파악 → RUN/SKIP 기록 (필수)
- [ ] librarian: 근거 수집 → RUN/SKIP 기록
- [ ] spec-acceptance: AC 초안 → RUN/SKIP 기록

### Step 4: 구현 (Phase 2)
- [ ] implementer: 코드 변경 → RUN/SKIP 기록 (필수)

### Step 5-7: 검증 (Phase 3)
- [ ] runner: typecheck/test → RUN/SKIP 기록 (필수)
- [ ] security-license: 보안 스캔 → RUN/SKIP 기록
- [ ] verifier: 3종 근거 확인 → RUN/SKIP 기록 (필수)

### Step 8: 판정 (Phase 4)
- [ ] codex-verifier: 최종 판정 → RUN/RUN(UNCERTAIN) 기록 (필수)

### Step 9: 문서화 (Phase 5)
- [ ] doc-manager: 문서 반영 → RUN/SKIP 기록 (필수)
- [ ] RUN_LOG 최종 업데이트 (Result, 종료 시간)

### 완료 선언
- [ ] Summary 출력 (RUN/SKIP/FAIL 카운트)
- [ ] RUN_LOG 기록 확인 (없으면 완료 선언 금지)
- [ ] Result: PASS/FAIL/UNCERTAIN 명시
```

### 수동 호출 가이드 (Step 0-9)

Claude Code에서 에이전트 자동 호출 불가. 사용자가 수동으로:

```
0. docs-scan: "./scripts/install.sh --docs-scan" (조건부)
1. explore: "프로젝트 구조 파악해줘"
2. librarian: "관련 코드 근거 수집해줘"
3. spec-acceptance: "AC 초안 작성해줘"
4. implementer: "코드 변경해줘"
5. runner: "테스트 실행해줘"
6. security-license: "보안 스캔해줘"
7. verifier: "근거 완비 확인해줘"
8. codex-verifier: "최종 판정해줘"
9. doc-manager: "문서 반영해줘"
```

### 콘솔 출력 포맷 (강제)

**각 단계 완료 시 헤더 출력 (Step 0-9):**
```
⏭️ [ULW][STEP 0/9][docs-scan][SKIP] 최근 스캔 유효
✅ [ULW][STEP 1/9][explore][RUN] 프로젝트 구조 탐색 완료
⏭️ [ULW][STEP 2/9][librarian][SKIP] 근거 충분
✅ [ULW][STEP 4/9][implementer][RUN] 코드 구현 완료, commit abc1234
❌ [ULW][STEP 5/9][runner][FAIL] 테스트 실패
⚠️ [ULW][STEP 8/9][codex-verifier][RUN(UNCERTAIN)] SKIP_CODEX=1
```

**최종 Summary (10단계 완료 후 필수):**
```
════════════════════════════════════════
[ULW Summary] (10 steps: 0-9)
  RUN: 7 / SKIP: 2 / FAIL: 1
  Result: FAIL (runner 재시도 필요)
  Evidence:
    - Preflight: docs-scan SKIP
    - 탐색: explore 결과
    - 구현: commit abc1234
    - 테스트: test.log (FAIL)
    - RUN_LOG: docs/03_ops/RUN_LOG.md#ULW-001
════════════════════════════════════════
```

### Soft Gate 정합 (SKIP_CODEX=1)

| 상황 | codex-verifier 동작 | 기록 |
|------|---------------------|------|
| SKIP_CODEX=0 | 정상 실행 | RUN + PASS/FAIL |
| SKIP_CODEX=1 | 실행하되 UNCERTAIN | RUN(UNCERTAIN) |

> **핵심**: Codex 없어도 ULW 파이프라인이 막히지 않음. SKIP 금지 규칙 준수하면서 UNCERTAIN 허용.

### 강제 규칙

- ⚠️ **RUN_LOG 기록 없이 완료 선언 금지**
- ⚠️ 필수 단계 SKIP 금지 (단, codex-verifier는 SKIP_CODEX=1이면 RUN(UNCERTAIN) 허용)
- ✅ SKIP 시 사유 명시
- ✅ FAIL 시 Next Actions 명시 후 재시도
