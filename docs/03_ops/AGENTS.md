# Agents Role Map

> 에이전트별 역할, 권한, 완료 조건 정의

## 프로파일: Core vs Pro

```bash
# 프로파일 전환
./scripts/install.sh --profile core  # Core만
./scripts/install.sh --profile pro   # Pro 활성화
./scripts/install.sh --status        # 현재 상태 확인
```

### Core vs Pro 비교표

| 에이전트 | Core | Pro | 모델 | 역할 | 권한 |
|----------|:----:|:---:|------|------|------|
| doc-manager | ✅ | ✅ | sonnet | 문서 관리 | Read, Write, Edit |
| codex-verifier | ✅ | ✅ | sonnet | 최종 판정 (Codex) | Read, Bash |
| runner | ✅ | ✅ | sonnet | 테스트/빌드 실행 | Bash, Read |
| verifier | ✅ | ✅ | sonnet | 근거 수집 (판정 X) | Read, Grep, Glob |
| explore | - | ✅ | haiku | 빠른 탐색 | Read, Grep, Glob |
| librarian | - | ✅ | sonnet | 근거 수집/요약 | Read, Grep, Glob |
| implementer | - | ✅ | opus | 코드 구현 (**Write 전담**) | Read, Write, Edit |
| context-keeper | - | ✅ | sonnet | Resume Pack 갱신 | Read, Write, Edit |
| security-license | - | ✅ | sonnet | 보안/라이선스 스캔 | Read, Grep, Bash |
| spec-acceptance | - | ✅ | sonnet | AC 초안 작성 | Read, Grep, Glob |
| main-orchestrator | - | ✅ | opus | 플레이북/체크리스트 | All |

### 파일 위치

```
.claude/agents/
├── doc-manager.md      # Core
├── codex-verifier.md   # Core
├── runner.md           # Core
├── verifier.md         # Core
└── pro/                # Pro 원본 (항상 보존)
    ├── explore.md
    ├── librarian.md
    ├── implementer.md
    ├── context-keeper.md
    ├── security-license.md
    ├── spec-acceptance.md
    └── main-orchestrator.md
```

> **정책**: pro/ 폴더는 원본 보관, 활성화 시 상위 폴더(.claude/agents/)에 링크/복사됨

---

## Pro 실행 흐름

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
│  │ implementer │ → Write/Edit (유일한 코드 수정자)       │
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
│  Phase 4: 최종 판정 (Codex)                              │
│  ┌────────────────┐                                     │
│  │ codex-verifier │ → PASS / FAIL / UNCERTAIN           │
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

### 완료 조건

- [ ] codex-verifier: **PASS**
- [ ] doc-manager: 문서/PRD Sync 완료
- [ ] context-keeper: RESUME_PACK.md 갱신

---

## 권한 규칙 (강제)

- **코드 수정**: implementer만
- **문서 수정**: doc-manager + context-keeper만
- **나머지**: Read-only

---

## 커밋 메시지 규칙

### 형식

```
<TAG>: <한국어 요약>
```

- **TAG**: 영어 고정 (아래 표 참조)
- **설명**: 한국어 (기술용어/명령어/파일명은 영어 그대로)

### TAG 종류

| TAG | 용도 | 예시 |
|-----|------|------|
| `F-XXX` | 기능 추가/변경 | `F-001: 사용자 인증 기능 추가` |
| `BUG-XXX` | 버그 수정 (이슈 번호) | `BUG-042: 로그인 세션 만료 버그 수정` |
| `BUG` | 버그 수정 (번호 없음) | `BUG: null 체크 누락 수정` |
| `REFACTOR` | 리팩토링 (동작 불변) | `REFACTOR: UserService 의존성 주입 개선` |
| `CHORE` | 빌드/린트/의존성 | `CHORE: eslint 규칙 업데이트` |
| `DOCS` | 문서 수정 | `DOCS: README에 설치 가이드 추가` |
| `OPS` | 운영/인프라 | `OPS: pre-commit hook 경고 모드 전환` |

### 예시

```bash
# 기능 추가
F-001: 사용자 프로필 페이지 구현

# 버그 수정
BUG-123: LoginForm에서 빈 password 허용되는 버그 수정

# 리팩토링
REFACTOR: ApiClient를 singleton에서 DI 방식으로 변경

# 빌드/의존성
CHORE: package.json에 typescript 5.0 추가

# 문서
DOCS: AGENTS.md에 커밋 메시지 규칙 섹션 추가

# 운영
OPS: GitHub Actions workflow 타임아웃 설정

# 복합 (드물게)
F-002: OAuth 로그인 추가 + BUG: redirect_uri 인코딩 수정
```

### 강제 규칙

- implementer가 커밋 시 **반드시 TAG로 시작**
- pre-commit hook이 TAG 누락 시 경고 출력 (차단 X)

---

## Sisyphus 역할 매핑

| Sisyphus 역할 | 모델 (원본) | 이 설계 에이전트 |
|---------------|-------------|------------------|
| Main Agent | Claude Opus 4.5 | main-orchestrator |
| Oracle | GPT 5.2 Codex | oracle |
| Plan | GPT 5.2 Codex | codex-planner |
| Frontend UI/UX | Claude Opus 4.5 | implementer |
| Librarian | Claude Sonnet 4.5 | librarian |
| Explore | Claude Haiku 4.5 | explore |
| Document Writer | Claude Sonnet 4.5 | doc-manager + context-keeper |

---

## Codex CLI 셋업 (온보딩)

OpenAI Codex CLI를 사용하여 Plan/Verify 역할을 수행합니다.

### 개발자별 1회 셋업

```bash
# 1) Codex CLI 설치 (아직 안 했다면)
npm install -g @openai/codex

# 2) OAuth 로그인 (1회)
codex login

# 3) 로그인 상태 확인
codex login status
# exit 0 = 로그인됨
# exit 1 = 로그인 필요
```

### 자동화 스크립트에서 체크

```bash
# 로그인 상태 확인 (스크립트용)
if ! codex login status >/dev/null 2>&1; then
  echo "ERROR: Codex 로그인 필요. 'codex login' 실행하세요."
  exit 1
fi
```

### 비대화형 실행 (CI/자동화용)

```bash
# 프롬프트 파일로 실행
codex exec "$(cat prompt.md)" --json

# 또는 인라인 프롬프트
codex exec "이 코드의 AC를 검증해줘: ..." --json
```

### Codex 호출 에이전트

| 에이전트 | Codex 사용 목적 |
|----------|-----------------|
| oracle | Codex API 래퍼 (공통 호출 인터페이스) |
| codex-planner | Plan 확정 (기획/설계) |
| codex-verifier | 최종 PASS/FAIL/UNCERTAIN 판정 |

### 트러블슈팅

| 문제 | 해결 |
|------|------|
| `codex: command not found` | `npm install -g @openai/codex` |
| `Not logged in` | `codex login` 실행 |
| 토큰 만료 | `codex login` 재실행 |

---

## 개인 설정 (티어/비용 관리)

### flow CLI 사용법

```bash
# 현재 상태 확인
./scripts/flow status

# 티어 설정 (비용 절감)
./scripts/flow tier low        # sonnet/haiku 중심
./scripts/flow tier default    # frontmatter 기본값
./scripts/flow tier high       # opus 활성화

# Codex on/off
./scripts/flow codex off       # SKIP_CODEX=1
./scripts/flow codex on        # Codex 활성화

# 프리셋 적용
./scripts/flow preset low      # 비용 절감 프리셋
./scripts/flow preset default  # 기본 프리셋
./scripts/flow preset high     # 풀옵션 프리셋

# 설정 적용 미리보기
./scripts/flow apply           # dry-run (v1)
```

### 환경변수

| 변수 | 값 | 효과 |
|------|-----|------|
| `CLAUDE_TIER` | low/default/high | 모델 폴백 기준 |
| `SKIP_CODEX` | 1 | codex-verifier → UNCERTAIN |

### 설정 파일

- **개인 설정**: `.claude/config.local` (gitignore, 커밋 금지)
- **프리셋 템플릿**: `.claude/presets/*.template` (커밋됨, 읽기 전용 참고)

### Soft Gate 정책

- frontmatter `model`은 **권장값**, 티어 부족 시 자동 폴백
- `SKIP_CODEX=1` → codex-verifier **UNCERTAIN**, DOC_DEBT 자동 기록
- **완료 조건**: PASS 권장 (UNCERTAIN도 진행 가능, 단 경고)
- **팀 혼합**: 팀 내 누구든 PASS 받으면 전체 PASS로 간주

---

## ULW 프로토콜 (Ultra Lightweight Workflow)

### 트리거 규칙

메시지 **끝**에 `ulw` 토큰이 있을 때만 ULW 모드 발동:

```
정규식: /\s*(ulw|ULW|\(ulw\)|\[ulw\])$/
```

| 메시지 | 발동 | 이유 |
|--------|:----:|------|
| `로그인 기능 구현해줘 ulw` | ✅ | 끝에 ulw |
| `버그 수정해줘 (ulw)` | ✅ | 끝에 (ulw) |
| `[ulw] 테스트 추가` | ❌ | ulw가 앞에 있음 |
| `ulw 명령어 설명해줘` | ❌ | ulw가 앞에 있음 |
| `이 ulw 코드 리뷰해줘` | ❌ | ulw가 중간에 있음 |

### 처리 절차

1. **토큰 제거**: 원문에서 ulw 토큰 제거 후 정제문 생성
2. **RUN_LOG 기록**: 원문 + 정제문 둘 다 기록
3. **9단계 실행**: Pro 파이프라인 순서대로 RUN/SKIP 판단
4. **콘솔 출력**: 각 단계별 헤더 출력 (아래 포맷)
5. **결과 기록**: 각 단계별 Evidence 기록
6. **Summary 출력**: 최종 집계 + Evidence 링크
7. **완료 선언**: RUN_LOG 기록 없이 완료 선언 **금지**

### 콘솔 출력 포맷 (강제)

각 단계 시작/종료 시 아래 헤더를 **반드시** 출력:

```
⏭️ [ULW][STEP 0/9][docs-scan][SKIP] 최근 스캔 유효
✅ [ULW][STEP 1/9][explore][RUN] 프로젝트 구조 탐색 완료
⏭️ [ULW][STEP 2/9][librarian][SKIP] 근거 충분하여 생략
❌ [ULW][STEP 5/9][runner][FAIL] 테스트 실패 - 재시도 필요
```

**상태 아이콘:**
| 상태 | 아이콘 | 의미 |
|------|:------:|------|
| RUN | ✅ | 정상 실행 완료 |
| RUN(UNCERTAIN) | ⚠️ | 실행했으나 UNCERTAIN (Soft Gate) |
| SKIP | ⏭️ | 사유 있는 생략 |
| FAIL | ❌ | 실패 (재시도 필요) |

**최종 Summary (Step 0~9 완료 후 필수 출력):**

```
════════════════════════════════════════
[ULW Summary] (10 steps: 0-9)
  RUN: 7 / SKIP: 2 / FAIL: 1
  Result: FAIL (runner 재시도 필요)
  Evidence:
    - Preflight: docs-scan SKIP (최근 유효)
    - 탐색: explore 결과
    - 구현: commit abc1234
    - 테스트: test.log (FAIL)
    - RUN_LOG: docs/03_ops/RUN_LOG.md#ULW-001
════════════════════════════════════════
```

### 10단계 파이프라인 (Step 0~9)

| # | Agent/Script | Phase | 필수 | 비고 |
|---|--------------|-------|:----:|------|
| 0 | docs-scan | Preflight | - | 조건부 (아래 참조) |
| 1 | explore | 탐색 | ✅ | |
| 2 | librarian | 탐색 | - | |
| 3 | spec-acceptance | 탐색 | - | |
| 4 | implementer | 구현 | ✅ | |
| 5 | runner | 검증 | ✅ | |
| 6 | security-license | 검증 | - | |
| 7 | verifier | 검증 | ✅ | |
| 8 | codex-verifier | 판정 | ✅ | SKIP_CODEX=1 → RUN(UNCERTAIN) |
| 9 | doc-manager | 문서화 | ✅ | |

### Step 0: docs-scan (Preflight)

**트리거 조건 (OR):**
- ANCHOR.md에 Legacy 상태가 UNKNOWN (첫 실행)
- docs/ 디렉토리에 변경 있음 (`git diff --name-only | grep docs/`)
- 마지막 scan이 7일 이상 경과

**동작:**
| 조건 | 동작 | 출력 |
|------|------|------|
| 조건 충족 | `./scripts/install.sh --docs-scan` | ✅ [ULW][STEP 0/9][docs-scan][RUN] |
| 조건 미충족 | SKIP | ⏭️ [ULW][STEP 0/9][docs-scan][SKIP] 최근 스캔 유효 |
| bash 없음 | SKIP | ⏭️ [ULW][STEP 0/9][docs-scan][SKIP] bash 필요 |

> **Note**: Step 0는 필수 아님. SKIP해도 파이프라인 진행 가능.

### RUN_LOG 기록 형식

```markdown
## ULW-001: (정제된 요청)

| 항목 | 값 |
|------|-----|
| 원문 | (ulw 포함 원문) |
| 정제문 | (ulw 제거 후) |
| Profile | pro |
| Tier | high |
| Codex | on |
| Result | PASS/FAIL |

### Steps

| # | Agent | Status | Evidence |
|---|-------|--------|----------|
| 1 | explore | RUN | 탐색 결과 |
| 2 | librarian | SKIP | - |
| ... | ... | ... | ... |
```

### 강제 규칙

- ❌ RUN_LOG 기록 없이 "완료" 선언 금지
- ❌ 필수 단계(✅) SKIP 금지 (FAIL은 허용, 재시도 필요)
- ✅ SKIP 시 사유 명시
- ✅ FAIL 시 Next Actions 명시

### Soft Gate 정합 (SKIP_CODEX=1)

`SKIP_CODEX=1` 환경에서 codex-verifier는 **SKIP 금지** 규칙의 예외:

| 상황 | 동작 | 기록 |
|------|------|------|
| SKIP_CODEX=0 (기본) | codex-verifier 정상 실행 | RUN + PASS/FAIL |
| SKIP_CODEX=1 | codex-verifier **실행하되 UNCERTAIN** | RUN(UNCERTAIN) |

**RUN(UNCERTAIN) 처리:**
```
⚠️ [ULW][STEP 8/9][codex-verifier][RUN(UNCERTAIN)] SKIP_CODEX=1
```

- codex-verifier는 "실행"으로 간주 (SKIP 아님)
- Result는 **UNCERTAIN** 고정
- DOC_DEBT에 자동 기록
- 팀 내 누군가 PASS 받으면 전체 PASS로 간주

**목적**: Codex 미설치/미로그인 유저도 ULW 파이프라인이 막히지 않도록 필수 단계 철학 유지
