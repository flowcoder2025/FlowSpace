# FlowSpace + FlowSubAgent

> **프로젝트**: FlowSpace - ZEP-감성 2D 메타버스 플랫폼
> **PRD**: [docs/prd.md](docs/prd.md)

## 세션 시작 규칙

**모든 세션/작업 시작 시 반드시 읽을 것:**
→ [docs/03_ops/ANCHOR.md](docs/03_ops/ANCHOR.md)

## SSOT (Single Source of Truth)

| 문서 | 역할 |
|------|------|
| [docs/03_ops/ANCHOR.md](docs/03_ops/ANCHOR.md) | **진입점** (세션 시작) |
| [docs/prd.md](docs/prd.md) | 요구사항 SSOT |
| [docs/03_ops/AGENTS.md](docs/03_ops/AGENTS.md) | 운영/에이전트 SSOT |

## 완료 조건

- [ ] codex-verifier: **PASS**
- [ ] doc-manager: 문서 반영 완료
- [ ] context-keeper: RESUME_PACK.md 갱신

## 프로파일

| 프로파일 | 에이전트 | 용도 |
|----------|----------|------|
| **core** | 4개 | 가벼운 운영 |
| **pro** | 11개 | Sisyphus 스타일 멀티 에이전트 |

```bash
./scripts/install.sh --profile pro    # Pro 활성화
./scripts/install.sh --profile core   # Core로 복귀
./scripts/install.sh --status         # 현재 상태
```

## 상세 문서

- [docs/03_ops/AGENTS.md](docs/03_ops/AGENTS.md) - 에이전트 역할/권한/커밋 규칙
- [docs/RESUME_PACK.md](docs/RESUME_PACK.md) - 세션 재개용
- [docs/ROADMAP.md](docs/ROADMAP.md) - 개발 로드맵

## FlowSpace 프로젝트 규칙

> 프로젝트별 규칙 (디자인 토큰, 버튼 규칙, 기술 스택 등)

→ [docs/04_reference/legacy_claude_md/FLOWSPACE_RULES.md](docs/04_reference/legacy_claude_md/FLOWSPACE_RULES.md)

**핵심 금지 사항** (항상 적용):
- ❌ 토큰/색상 하드코딩 금지 (`bg-[#xxx]` 금지)
- ❌ 버튼 variant 추가 확장 금지
- ❌ 컴포넌트 내 한글 하드코딩 금지 (text-config.ts 사용)
- ❌ SQL 직접 쿼리 금지 (Prisma 사용)

---

## ULW 트리거 모드

메시지 **끝**에 `ulw` 토큰이 있을 때만 ULW(Ultra Lightweight Workflow) 프로토콜이 발동됩니다.

### 트리거 판정 (정규식)

```
/\s*(ulw|ULW|\(ulw\)|\[ulw\])$/
```

| 예시 | 발동 |
|------|:----:|
| `로그인 기능 구현해줘 ulw` | ✅ |
| `버그 수정 (ulw)` | ✅ |
| `ulw 이건 중간에 있음` | ❌ |
| `ULW로 시작하는 문장` | ❌ |

### ULW 프로토콜 규칙

1. ULW 토큰 제거 후 요청 처리
2. Pro 파이프라인 10단계 (Step 0-9)를 **RUN/SKIP/FAIL**로 기록
3. 완료 선언은 **RUN_LOG 기록 없이 금지**
4. 기록: [docs/03_ops/RUN_LOG.md](docs/03_ops/RUN_LOG.md)

### 콘솔 출력 포맷 (강제)

```
⏭️ [ULW][STEP 0/9][docs-scan][SKIP] 최근 스캔 유효
✅ [ULW][STEP 1/9][explore][RUN] 프로젝트 구조 탐색 완료
⏭️ [ULW][STEP 2/9][librarian][SKIP] 근거 충분
✅ [ULW][STEP 4/9][implementer][RUN] 코드 구현 완료, commit abc1234
❌ [ULW][STEP 5/9][runner][FAIL] 테스트 실패
⚠️ [ULW][STEP 8/9][codex-verifier][RUN(UNCERTAIN)] SKIP_CODEX=1
```

### 최종 Summary (필수)

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
    - RUN_LOG: docs/03_ops/RUN_LOG.md#ULW-XXX
════════════════════════════════════════
```

### 강제 규칙

- ⚠️ **RUN_LOG 기록 없이 완료 선언 금지**
- ⚠️ 필수 단계 SKIP 금지 (codex-verifier는 SKIP_CODEX=1이면 RUN(UNCERTAIN) 허용)
- ✅ SKIP 시 사유 명시
- ✅ FAIL 시 Next Actions 명시 후 재시도

> 상세: [docs/03_ops/AGENTS.md](docs/03_ops/AGENTS.md) → ULW 프로토콜 섹션

---

## 개인 설정 (티어/Codex)

```bash
# 프리셋 적용
./scripts/flow preset high     # 풀옵션

# 개별 설정
./scripts/flow tier high       # 티어 변경
./scripts/flow codex on        # Codex 활성화

# 상태 확인
./scripts/flow status
```

---

> **정책**: 이 파일은 필수 요소만 포함. 상세 규칙은 `/docs/03_ops/`에서 관리.
> 프로젝트별 규칙은 `/docs/04_reference/legacy_claude_md/`에서 관리.
