> **SSOT = docs/03_ops/AGENTS.md** (이 문서는 아카이브용)

# Claude CLI(Claude Code)에서 Sisyphus 스타일 서브에이전트 오케스트레이션

## 목표
- Claude CLI에서 **역할별 서브에이전트**를 두고(문서/QA/컨텍스트 등), **모델/툴 권한을 분리**해 운영한다.
- **할루시네이션을 0%로 “보장”**하기보다는, **근거 기반 게이트(Verifier)** + **훅/스크립트 차단**으로 “결론에 영향 못 주게” 만든다.

---

## 결론(가능/제약)
### ✅ 가능한 것
- Claude Code는 `.claude/agents/*.md`에 **서브에이전트 정의**를 저장하고, 에이전트별로 **역할/툴 제한/모델(inherit/sonnet/opus/haiku)**을 분리 운영할 수 있다.
- 고출력 작업(빌드/테스트/린트)을 **Runner 에이전트로 격리**하고, 메인 컨텍스트 오염을 줄이는 패턴이 잘 맞는다.
- Hook(예: PreToolUse/PostToolUse 등) + 스크립트로 **위험 커맨드 차단 / 테스트 강제 / 문서 드리프트 감지** 같은 운영 자동화가 가능하다.

### ⚠️ 제한/차이
- Sisyphus처럼 **서브에이전트 모델을 GPT 계열로 “직접” 선택**하는 방식은 Claude Code 기본 기능만으로는 어렵다.
- 대신 ‘Oracle 에이전트’가 **외부 호출 도구(MCP/Bash 스크립트/API 래퍼)**를 통해 OpenAI를 호출하도록 설계하면 **오케스트레이션 관점에서 동일한 효과**를 낼 수 있다.

---

## 추천 아키텍처(감사-게이트 중심)
> 핵심은 Verifier(증거-감사)가 “통과”를 결정하고, 다른 에이전트는 “제안/실행”을 담당하는 구조.

### 권장 실행 흐름
1) **Explore (read-only)**: 코드/문서/테스트 구조 파악
2) **Spec/AC**: 기대결과(수용기준)·엣지케이스·테스트 가능 문장으로 정리
3) **Implementer**: 코드 변경
4) **Runner**: 빌드/테스트/린트 실행(고출력 격리)
5) **Verifier**: diff + 로그/출력 근거로 **Pass/Fail 판정**
6) **Doc Manager**: spec drift 발생 시 문서 업데이트 + 변경이력 기록
7) **Context Keeper**: 세션 종료 전 **Resume Pack** 생성(다음 세션 재개용)

---

## 서브에이전트 구성(필수/권장)

### 사용자가 제안한 3개
- **Document Manager**: 코드베이스 ↔ 문서 일치 확인, 변경 발생 시 문서 갱신
- **QA**: 실제 결과 vs 기대 결과 비교, 실패 시 원인/재현/수정 안내
- **Context Keeper**: 오토 컴팩트/세션 전환 시 핵심 손실 방지 요약

### 추가하면 “필수급”으로 좋은 것
- **Verifier(증거-감사) ★핵심**
  - “성공/완료/해결” 같은 결론은 **근거(테스트 로그, diff, 파일 내용)** 없으면 금지
  - 근거가 없으면 항상 `불확실`로 판정 → 추가 수집 액션 지시

- **Spec/Acceptance(명세·수용기준)**
  - 요구를 테스트 가능한 수용기준(AC)으로 변환
  - QA가 주관적 검증을 하지 않게 ‘기대값’을 고정

- **Runner(빌드/테스트 전담)**
  - 테스트/빌드/린트 등 고출력 작업을 전담
  - 메인 컨텍스트 토큰 오염, 로그 누락을 줄임

- **Security/License**
  - 시크릿/권한/취약점/라이선스 충돌 점검
  - Hook으로 위험 커맨드 차단과 궁합이 좋음

- **Cost/Budget Router(비용·모델 라우팅)**
  - 에이전트별로 모델을 전략적으로 배치(정리/문서=저가, 아키텍처/복잡 판단=고가)

---

## 모델 매핑 예시(Claude-only 기본)
- **Main Orchestrator**: `opusplan` 권장(계획은 Opus, 구현은 Sonnet 스위칭)
- **Explore**: `haiku` (빠르고 비용 효율)
- **Librarian/Doc Writer**: `sonnet` (문서 안정)
- **QA/Runner**: `sonnet` (테스트/로그 판독)
- **Multimodal Looker**: `opus` (이미지/복잡한 판단)
- **Verifier**: `sonnet` 또는 `opus`(프로젝트 중요도에 따라)

> GPT 기반 Oracle이 필요하면: Oracle 에이전트는 Claude 모델을 유지하되, **외부 호출 도구로 GPT를 호출**하게 설계.

---

## 운영 자동화(트리거/훅) 설계
> “모델이 틀릴 수 있다”를 전제로, **행동과 결과를 자동으로 검증/차단**하는 레일을 깐다.

### Hook/트리거 예시
- **PreToolUse(Bash)**
  - 위험 명령 차단: `rm -rf`, DB drop, 무분별한 권한 변경 등
  - 테스트 없이 push/merge 시도 → 차단 또는 경고 후 중단

- **PostToolUse(Write/Edit)**
  - 코드 파일 변경 감지 시 `doc drift check` 트리거
  - 문서 업데이트 필요하면 Doc Manager 호출

- **Git hooks (pre-commit / pre-push)**
  - Runner로 테스트 실행 → 실패 시 중단
  - Verifier가 “근거 없는 완료 선언”을 못 하게 강제

- **Session End(종료 루틴)**
  - Context Keeper가 Resume Pack 생성

---

## 할루시네이션을 ‘무력화’하는 최소 규칙 6개
1) **Verifier는 read-only + 근거만으로 판정**(가능하면 Write/Edit 금지)
2) “완료/해결/성공” 선언은 **근거 링크(로그/diff/파일)** 없으면 금지
3) Doc Manager는 **diff 입력**이 있을 때만 문서 수정
4) QA는 항상 **Spec/AC 산출물**을 입력으로 받아 검증(주관 QA 금지)
5) Context Keeper는 결론이 아니라 **결정사항/근거/다음 액션** 중심으로 Resume Pack 작성
6) 비용 통제: 정리/검색/문서=저가 모델, 복잡 판단/아키텍처=고가 모델

---

## 폴더/파일 구조(추천)
- `.claude/agents/`
  - `main-orchestrator.md`
  - `explore.md`
  - `spec-acceptance.md`
  - `implementer.md`
  - `runner.md`
  - `verifier.md`
  - `doc-manager.md`
  - `context-keeper.md`
  - `security-license.md` (선택)

- `.claude/hooks/` (또는 운영 스크립트 디렉토리)
  - `pre_tool_use.sh`
  - `post_tool_use.sh`
  - `doc_drift_check.sh`
  - `require_tests_before_push.sh`

- `docs/` 또는 `README.md`
  - `DECISIONS.md` (의사결정/근거 기록)
  - `RESUME_PACK.md` (세션 재개용)

---

## 단계별 도입(추천)
1) **Runner + Verifier** 먼저 도입(테스트/근거 게이트)
2) **Doc Manager + doc drift check** 추가
3) **Context Keeper + Resume Pack**으로 세션 품질 안정화
4) 필요 시 **Security/License, Cost Router, External Oracle** 순으로 확장

---

## 다음 액션(바로 진행 가능)
- 위 구조대로 `.claude/agents/*.md` 템플릿을 **붙여넣기 형태**로 생성
- Hook 스크립트(PreToolUse/PostToolUse + git hooks) 기본 세트 작성
- Verifier의 “근거 포맷”을 고정(예: diff + 테스트 로그 요약 + 실패 시 재현 커맨드)



# Claude가 그대로 실행하는 통합본 (필수+선택 모두 적용)

> 이 섹션은 **분기(필수/선택) 없이** 바로 운영 가능한 **완전 통합본**이다.
> 원칙: **읽기/검증은 병렬**, **Write는 1명(Implementer)만**, 최종은 **Verifier가 근거로 PASS/FAIL/UNCERTAIN**.

---

## 0) 한 번에 만드는 디렉토리/기본 파일
프로젝트 루트에서 실행:

```bash
mkdir -p .claude/agents .claude/hooks .claude/state .claude/tools docs
: > docs/DECISIONS.md
: > docs/RESUME_PACK.md
```

---

## 1) 에이전트 구성(통합: 첨부 역할/모델 느낌 반영)

아래는 **첨부(Sisyphus) 역할/모델 조합**을, **현재 작성된 서브에이전트(파일명/역할)는 그대로 유지**하면서 매핑한 표다.

| 첨부 역할 | 적용 모델(첨부) | 이 설계에서 대응되는 에이전트 | 실제 동작 방식 |
|---|---|---|---|
| Sisyphus (Main Agent) | Claude Opus 4.5 | `main-orchestrator` | 전체 지휘/결정. Claude 모델은 Opus로 고정 |
| Oracle | GPT 5.2 Codex | `oracle` | 외부 호출 공통 래퍼. 기본 MODEL을 gpt-5.2-codex로 사용 |
| Plan | GPT 5.2 Codex | `codex-planner` | 기획/설계를 Codex로 확정(oracle 경유) |
| Frontend UI/UX Engineer | Claude Opus 4.5 | `implementer` | 실제 구현(코드 Write)은 implementer만. Opus로 고정 |
| Librarian | Claude Sonnet 4.5 | `librarian` | 검색/정리/근거 수집. Sonnet으로 고정 |
| Explore | Claude Haiku 4.5 | `explore` | 빠른 탐색/읽기. Haiku로 고정 |
| Document Writer | Claude Sonnet 4.5 | `doc-manager` + `context-keeper` | 문서 반영/Resume Pack 작성. Sonnet으로 고정 |
| Multimodal Looker | Claude Opus 4.5 | `main-orchestrator`(또는 `implementer`) | 이미지/복잡 판단이 필요하면 Opus 역할이 담당(별도 에이전트 추가 없이) |

추가 운영 에이전트(기존 유지):
- `runner`(Sonnet): 테스트/빌드 실행 요약
- `verifier`(Sonnet): 근거 3종(AC+diff+로그) 체크(최종 판정은 `codex-verifier`)
- `codex-verifier`(Codex): 최종 PASS/FAIL/UNCERTAIN 판정(oracle 경유)
- `security-license`(Sonnet): 보안/라이선스 점검

**권한 규칙(강제)**
- 코드 수정: implementer만
- 문서 수정: doc-manager + context-keeper만
- 나머지: Read-only

---

## 2) 에이전트 파일(붙여넣기 템플릿)

### 2-1) main-orchestrator.md
`.claude/agents/main-orchestrator.md`
```md
---
name: main-orchestrator
model: opus
tools: Read, Grep, Glob, Bash, Write, Edit
---
너는 오케스트레이터다.

[절대 원칙]
- 병렬 가능한 작업은 병렬로 실행하되, 코드 Write/Edit는 implementer만 하도록 강제한다.
- 완료/성공/해결 선언은 **codex-verifier의 PASS**가 있어야만 가능하다.
- 모든 단계의 근거(AC, diff, 로그)를 남기고, 결정은 docs/DECISIONS.md에 기록한다.

[기본 실행 루프]
1) 병렬: explore + librarian + spec-acceptance
2) 직렬(Write): implementer
3) 병렬: runner + security-license + verifier(근거 수집)
4) codex-verifier 최종 판정:
   - PASS: doc-manager(필요 시) -> context-keeper
   - FAIL/UNCERTAIN: codex-verifier 요구사항에 맞춰 2~3 반복

[출력 포맷]
1) 지금 할 일(최대 5개)
2) 병렬로 돌릴 에이전트 + 입력
3) 직렬(Write 포함) 작업
4) verifier(근거 수집) + codex-verifier(최종 판정)에게 넘길 근거 목록
5) DECISIONS.md에 기록할 1~3줄
```

### 2-2) explore.md (Read-only)
`.claude/agents/explore.md`
```md
---
name: explore
model: haiku
tools: Read, Grep, Glob
---
너는 탐색 전담이다. 절대 코드를 수정하지 않는다.

해야 할 일:
- 관련 파일/디렉토리, 진입점, 테스트 위치, 실행 커맨드 후보를 찾는다.
- 문서(README/docs)와 구현(코드)의 연결 지점을 찾는다.

출력:
- 관련 파일 리스트(경로)
- 실행/테스트 커맨드 후보
- 불확실/리스크(근거 포함)
```

### 2-3) librarian.md (Read-only)
`.claude/agents/librarian.md`
```md
---
name: librarian
model: sonnet
tools: Read, Grep, Glob
---
너는 코드/문서의 검색·요약 담당이다. 수정하지 않는다.

해야 할 일:
- 키워드 기반으로 코드/문서에서 근거를 모아 요약한다.
- 오케스트레이터가 빠르게 의사결정할 수 있게 근거 중심으로 정리한다.

출력:
- 핵심 근거(파일/섹션 단위)
- 관련 경로
- 요약(최대 10줄)
```

### 2-4) spec-acceptance.md (Read-only)
`.claude/agents/spec-acceptance.md`
```md
---
name: spec-acceptance
model: sonnet
tools: Read, Grep, Glob
---
너는 명세/수용기준(AC) 담당이다. 코드를 수정하지 않는다.

해야 할 일:
- 요구를 테스트 가능한 문장(AC)으로 변환한다.
- 엣지케이스/실패조건/Non-goals 포함.

출력(고정):
- AC-1 ...
- AC-2 ...
- Edge cases
- Non-goals
- 검증 커맨드(테스트/빌드)
```

### 2-5) implementer.md (유일 코드 Write)
`.claude/agents/implementer.md`
```md
---
name: implementer
model: opus
tools: Read, Grep, Glob, Bash, Write, Edit
---
너는 구현 담당이다. 코드 수정(Write/Edit)은 오직 너만 한다.

규칙:
- 변경 이유/범위를 최소화한다.
- 변경 후 항상 git diff 요약과 수정 파일 목록을 남긴다.
- spec-acceptance의 AC를 만족하도록만 변경한다.

출력:
- 변경 요약(왜/무엇)
- 수정 파일 목록
- 테스트 커맨드(runner용)
- 리스크/남은 TODO
```

### 2-6) runner.md (고출력 격리, Read-only)
`.claude/agents/runner.md`
```md
---
name: runner
model: sonnet
tools: Bash, Read
---
너는 실행/테스트 전담이다. 코드를 수정하지 않는다.

규칙:
- 실행한 커맨드, 결과, 핵심 로그를 요약한다.
- 실패 시 재현 커맨드 + 원인 후보(근거 포함)를 제시한다.

출력:
- 커맨드 목록
- 결과(통과/실패)
- 핵심 로그(짧게)
- 다음 액션
```

### 2-7) verifier.md (근거 수집)
`.claude/agents/verifier.md`
```md
---
name: verifier
model: sonnet
tools: Read, Grep, Glob, Bash
---
너는 **근거 수집** 담당이다. 코드를 수정하지 않는다.
⚠️ 판정(PASS/FAIL/UNCERTAIN)은 하지 않는다. 최종 판정은 codex-verifier만 담당한다.

[역할]
- AC, git diff, 테스트/빌드 로그의 **존재 여부와 경로**를 수집한다.
- 3종 근거가 모두 존재하는지 확인한다.
- codex-verifier가 판정할 수 있도록 근거를 정리한다.

[출력 포맷 - 고정]
- AC 존재: YES/NO
  - 경로: (있으면 경로, 없으면 "미확인")
- Diff 존재: YES/NO
  - 경로: (있으면 경로, 없으면 "미확인")
- Log 존재: YES/NO
  - 경로: (있으면 경로, 없으면 "미확인")
- 3종 완비: YES/NO
- 다음 액션: (근거 부족 시 수집 커맨드 / 완비 시 "codex-verifier 호출 가능")
```

### 2-8) doc-manager.md (문서 업데이트)
`.claude/agents/doc-manager.md`
```md
---
name: doc-manager
model: sonnet
tools: Read, Grep, Glob, Write, Edit
---
너는 문서 담당이다. 코드 변경(diff/변경 파일)이 입력으로 주어진 경우에만 문서를 수정한다.

규칙:
- 문서 수정 범위를 최소화한다.
- 코드 근거(경로/함수/동작 변화)를 문서에 반영한다.

출력:
- 수정한 문서 목록
- 반영한 변경점(코드 근거 포함)
- 남은 문서 TODO
```

### 2-9) context-keeper.md (Resume Pack)
`.claude/agents/context-keeper.md`
```md
---
name: context-keeper
model: sonnet
tools: Read, Write, Edit
---
너는 세션 종료 전 컨텍스트 보존 담당이다.

해야 할 일:
- docs/RESUME_PACK.md를 갱신한다.

RESUME_PACK 형식(고정):
- 지금 상태
- 결정사항 + 근거
- 남은 TODO(우선순위)
- 재현/실행 커맨드
- 위험/불확실(근거)
```

### 2-10) security-license.md (Read-only + 실행)
`.claude/agents/security-license.md`
```md
---
name: security-license
model: sonnet
tools: Read, Grep, Glob, Bash
---
너는 보안/라이선스 점검 담당이다. 코드를 수정하지 않는다.

해야 할 일:
- 시크릿 노출(키/토큰), 위험 권한, 의존성 취약점, 라이선스 이슈 후보를 점검한다.

출력:
- 발견 사항(근거: 파일/명령 결과)
- 위험도(높음/중간/낮음)
- 권고 조치(커맨드/설정)
```

### 2-11) oracle.md (외부 모델 호출 공통 래퍼)
`.claude/agents/oracle.md`
```md
---
name: oracle
model: sonnet
tools: Bash, Read
---
너는 외부 오라클 호출 전담이다. 코드를 수정하지 않는다.

규칙:
- 외부 모델 호출은 반드시 래퍼 스크립트(.claude/tools/oracle.sh)를 통해서만 한다.
- 호출할 때는 항상 "입력 근거(AC/diff/log/snippets)"를 prompt 파일에 포함한다.
- 응답은 원문 + 사용 프롬프트 + 모델명 + (가능하면) 비용/토큰을 포함한다.
- oracle 결과는 **결정의 근거**로 사용되며, 로컬 근거가 부족하면 verifier는 UNCERTAIN을 유지한다.

출력:
- 요청 프롬프트(요약)
- 사용 모델
- 원문 응답
- 요약(최대 8줄)
- 제한/불확실
```

### 2-12) codex-planner.md (기획/설계 = Codex)
`.claude/agents/codex-planner.md`
```md
---
name: codex-planner
model: sonnet
tools: Read, Bash
---
너는 "Codex 기획자"다. 직접 기획하지 말고, 반드시 oracle 래퍼로 Codex에게 기획을 요청한다.

입력으로 반드시 받는 것:
- 문제/목표(한 줄)
- 관련 코드/문서 스니펫(경로 포함)
- 제약사항(Write는 implementer만 등)

절차:
1) 입력 근거를 모아 `.claude/state/codex_plan_prompt.md`에 정리한다.
2) `MODEL=gpt-5.2-codex .claude/tools/oracle.sh .claude/state/codex_plan_prompt.md` 실행
3) Codex 응답을 그대로 출력하되, 실행 가능한 단계(체크리스트/커맨드) 형태로 정리한다.

출력(고정):
- Plan(단계별)
- Risks/Unknowns
- Required Evidence(검증에 필요한 근거)
- Commands(권장 실행)
```

### 2-13) codex-verifier.md (검증/판정 = Codex)
`.claude/agents/codex-verifier.md`
```md
---
name: codex-verifier
model: sonnet
tools: Read, Bash
---
너는 "Codex 검증관"이다. 직접 판정하지 말고, 반드시 oracle 래퍼로 Codex에게 판정을 요청한다.

[필수 규칙]
- **템플릿 기반 판정**: `.claude/state/codex_verify_prompt.md` 템플릿의 섹션(AC/Diff/Logs) 중 하나라도 비어 있으면 **즉시 UNCERTAIN** 반환
- codex-verifier는 템플릿 기반으로만 판정한다

입력으로 반드시 받는 것(없으면 즉시 UNCERTAIN):
- AC 목록
- git diff(또는 변경 파일)
- 테스트/빌드 로그(또는 실행 결과)

절차:
1) 위 3종 근거를 `.claude/state/codex_verify_prompt.md` 템플릿에 채워 정리한다.
2) `.claude/tools/oracle.sh .claude/state/codex_verify_prompt.md` 실행
3) Codex가 PASS/FAIL/UNCERTAIN 중 하나로 판정하게 하고, 그 근거를 출력한다.

출력(고정):
- Verdict: PASS / FAIL / UNCERTAIN
- Evidence Review(AC/diff/log 기준)
- Missing Evidence
- Next Actions(커맨드 포함)
```

### 2-14) oracle 사용을 위한 prompt 파일 저장 규칙(통합)
- 모든 Codex 호출은 `.claude/state/` 아래에 prompt 파일로 저장한다.
- 파일에는 항상 근거를 포함한다(경로/커맨드/로그).

---

## 3) 오라클 래퍼 스크립트(통합 포함)
`.claude/tools/oracle.sh`
```bash
#!/usr/bin/env bash
set -euo pipefail

PROMPT_FILE="${1:-}"

# 1) Auth 체크 (공식: codex login status)
if ! codex login status >/dev/null 2>&1; then
  echo "[oracle] ERROR: Not logged in." >&2
  echo "[oracle] Run 'codex login' to authenticate." >&2
  exit 2
fi

# 2) 프롬프트 파일 검증
if [[ -z "$PROMPT_FILE" ]]; then
  echo "[oracle] Usage: oracle.sh <prompt_file>" >&2
  exit 2
fi

if [[ ! -f "$PROMPT_FILE" ]]; then
  echo "[oracle] ERROR: File not found: $PROMPT_FILE" >&2
  exit 2
fi

# 3) Codex exec 비대화형 호출 (공식: 인라인 프롬프트)
echo "[oracle] Calling Codex exec..." >&2
codex exec "$(cat "$PROMPT_FILE")" --json
```

```bash
chmod +x .claude/tools/oracle.sh
```

---

## 4) 훅(Pre/Post) + Git pre-push까지 통합 적용

### 4-1) PreToolUse: 위험 명령 차단
`.claude/hooks/pre_tool_use.sh`
```bash
#!/usr/bin/env bash
set -euo pipefail

PAYLOAD=$(cat)

# 단순 차단(필요하면 정교화)
# - rm -rf / 같은 파괴 명령
# - drop database
# - 악성 쉘 패턴
if echo "$PAYLOAD" | grep -Eqi 'rm -rf[[:space:]]+/|drop[[:space:]]+database|:(){:|:&};:'; then
  echo "Blocked dangerous command by policy" >&2
  exit 2
fi

exit 0
```

### 4-2) PostToolUse: 변경 파일 감지 + 문서 드리프트 후보 표시
`.claude/hooks/post_tool_use.sh`
```bash
#!/usr/bin/env bash
set -euo pipefail

CHANGED=$(git diff --name-only || true)

if [[ -n "$CHANGED" ]]; then
  echo "[post] changed_files:" >&2
  echo "$CHANGED" >&2

  # 코드 파일이 바뀌면 문서 드리프트 후보
  if echo "$CHANGED" | grep -Eqi '[.](ts|tsx|js|py|go|java|rs|cpp|c)$'; then
    echo "[post] doc_drift_candidate=true" >&2
  fi
fi

exit 0
```

```bash
chmod +x .claude/hooks/pre_tool_use.sh .claude/hooks/post_tool_use.sh
```

### 4-3) Git pre-push: 테스트 없이 푸시 금지
`.git/hooks/pre-push`
```bash
#!/usr/bin/env bash
set -euo pipefail

# 프로젝트에 맞게 바꿔라(예: pnpm test, npm run test, cargo test 등)
TEST_CMD=${TEST_CMD:-"npm test"}

echo "[pre-push] running: $TEST_CMD" >&2
$TEST_CMD

echo "[pre-push] ok" >&2
```

```bash
chmod +x .git/hooks/pre-push
```

---

## 5) 병렬/직렬 운용 규칙(충돌 없는 병렬)
- 병렬(허용): explore + librarian + spec-acceptance + security-license + runner + verifier(근거 수집)
- 직렬(강제): implementer(Write) -> runner(실행) -> verifier(근거 정리) -> codex-verifier(최종 판정, oracle 경유) -> doc-manager(문서) -> context-keeper(Resume)

동시에 Write 금지: implementer 외 누구도 코드 Write/Edit 금지.
최종 판정 주체: codex-verifier만 PASS/FAIL/UNCERTAIN을 판정한다. verifier는 근거 수집만 담당.

---

## 6) 오케스트레이터 운영 플레이북(그대로 수행: 기획/검증=Codex)
1) 병렬: explore + librarian + spec-acceptance 실행 -> 근거/초안 수집
2) 병렬(기획): **codex-planner** 실행 -> Codex가 Plan 확정(단계/리스크/검증근거)
3) 직렬: implementer가 Codex Plan + AC를 만족하도록 변경
4) 병렬: runner 테스트 + security-license 점검
5) 병렬(검증): **codex-verifier** 실행 -> Codex가 PASS/FAIL/UNCERTAIN 판정
6) Codex 판정이 PASS면: doc-manager로 문서 반영 -> context-keeper로 RESUME_PACK 갱신
7) FAIL/UNCERTAIN이면: codex-verifier의 Next Actions대로 3~5 반복

항상 남길 근거(최소):
- git diff 요약
- 실행한 테스트 커맨드
- 실패 시 핵심 로그 5줄 + 재현 커맨드
- 결정사항 1~3줄 -> docs/DECISIONS.md

---

## 7) 첫 실행 프롬프트(복붙)
오케스트레이터에게 그대로 입력:

"explore/librarian/spec-acceptance를 병렬로 돌려 관련 근거와 AC 초안을 만든 뒤, codex-planner로 Codex가 Plan을 확정하게 해.
그 다음 implementer가 코드 변경(Write/Edit)을 수행하고 runner가 테스트/빌드 로그를 남기며 security-license로 점검해.
verifier는 AC/Diff/Log 3종 근거의 존재 여부와 경로만 정리하고,
codex-verifier를 실행해 Codex가 PASS/FAIL/UNCERTAIN 최종 판정을 내리게 해.
PASS일 때만 doc-manager로 문서 반영하고 context-keeper로 RESUME_PACK을 갱신해.
완료 선언은 codex-verifier가 PASS이고 문서/Resume Pack 반영까지 끝난 뒤에만 해.
각 사이클마다 docs/DECISIONS.md에 결정사항 1~3줄(무엇/왜/근거)을 기록해."

---

## 8) Doc Manager 운영 정책 (PRD = SSOT)

### 8-1) 핵심 원칙
1. **PRD.md = Single Source of Truth** (원본 요구사항, 루트 고정)
2. **/docs = PRD 파생 문서** (설계/명세/운영/참고)
3. **기능 변경 시 PRD 미갱신이면** doc-manager가 "PRD 업데이트 필요" 경고/요청
4. **문서 생성/유지보수는 Feature ID 단위**로 추적

### 8-2) 권장 폴더 구조
```
PRD.md                          ← SSOT (루트 고정)
docs/
├── README.md                   ← docs 인덱스/목차
├── 01_arch/                    ← 아키텍처/흐름/구조
├── 02_specs/                   ← 기능/정책/명세 (Feature ID 기반)
│   └── F-XXX_<slug>.md         ← 예: F-012_oauth-login.md
├── 03_ops/                     ← 운영
│   ├── AGENTS.md               ← 에이전트 역할 맵/권한/완료 조건
│   └── DOC_DEBT.md             ← 문서 부채 추적
└── 04_reference/               ← 참고자료
    └── notes/                  ← 임시 메모 (YYYYMMDD_<slug>.md)
```

### 8-3) Feature ID / Commit 태그 규칙
| 타입 | 형식 | PRD 체크 | 예시 |
|------|------|----------|------|
| 기능 추가/변경 | `F-XXX` | ✅ 필수 (없으면 UNCERTAIN) | `F-012: add oauth` |
| 버그 수정 | `BUG-XXX` | ❌ 예외 | `BUG-003: fix null pointer` |
| 리팩토링 | `REFACTOR` | ❌ 예외 | `REFACTOR: cleanup auth` |
| 유지보수 | `CHORE` | ❌ 예외 | `CHORE: update deps` |

- **codex-verifier 규칙**: `F-XXX` 태그인데 PRD.md에 해당 Feature가 없으면 → PASS 금지, UNCERTAIN + "PRD 업데이트 필요" 반환
- **BUG/REFACTOR/CHORE**: PRD 존재 체크 예외

### 8-4) Owner 자동 기입 규칙
- **기본 Owner**: 현재 브랜치 HEAD 커밋 author (`git log -1 --format='%an'`)
- **Related commit**: HEAD 커밋 hash (`git log -1 --format='%h'`)
- **Co-owner/Reviewer**: optional (수동 기입)

### 8-5) doc-manager 출력 포맷 (고정)
```
[doc-manager 출력]
- Status: Updated | Doc Debt | Blocked | No Change
- PRD Sync: OK | NEEDS_UPDATE | MISMATCH
- Owner: @username
- Related commit: abc1234
- Updated files: [경로 리스트]
- Created files: [경로 리스트]
- Feature IDs affected: [F-XXX 리스트]
- Doc Debt: (있으면 항목)
- Evidence: (코드 근거 경로/커밋/diff)
```

### 8-6) Doc Debt 추적
`docs/03_ops/DOC_DEBT.md` 운영:
| ID | Feature | Description | Priority | Owner | Due (optional) |
|----|---------|-------------|----------|-------|----------------|
| DD-001 | F-012 | Spec 미작성 | HIGH | @jane | (optional) |

- doc-manager 출력에 항상 Status 포함: `Updated` / `Doc Debt` / `Blocked` / `No Change`

### 8-7) 작업 완료 표준 순서 (강제)
1. **typecheck**
2. **build/test**
3. **commit** (Feature ID 포함 권장)
4. **push** = 사용자 승인 이후에만 (자동 push 금지)

### 8-8) pre-push 경고 훅 (중간 강도)
```bash
#!/usr/bin/env bash
# codex-verifier PASS 여부 확인
if grep -q "codex-verifier: PASS" docs/RESUME_PACK.md 2>/dev/null || \
   grep -q "codex-verifier: PASS" docs/DECISIONS.md 2>/dev/null; then
  exit 0  # 경고 생략
fi

echo "⚠️  WARNING: codex-verifier PASS 미확인" >&2
echo "⚠️  계속 push하려면 10초 내 Ctrl+C" >&2
sleep 10
exit 0  # 차단하지 않음
```

### 8-9) docs 초기 스캐폴딩 (옵션)
```bash
# 프로젝트 루트에서 실행
mkdir -p docs/01_arch docs/02_specs docs/03_ops docs/04_reference/notes
touch docs/README.md docs/03_ops/DOC_DEBT.md docs/03_ops/AGENTS.md
# PRD.md 템플릿은 별도 생성
```


