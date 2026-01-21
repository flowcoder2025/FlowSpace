# HANDOFF - DocOps 도구 정리 완료

> **세션 핸드오프 문서**
> **작성일**: 2026-01-21
> **상태**: ✅ 완료

---

## 1. 배경

### 발견된 문제

이번 세션에서 BROKEN_EVIDENCE 33개를 해결하는 과정에서 **DocOps 도구 중복 문제** 발견:

| 도구 | 위치 | 출처 | 상태 |
|------|------|------|------|
| `npx create-docops verify` | npm 패키지 | FlowSubAgent 공식 | ✅ pre-commit hook에서 사용 |
| `scripts/specctl` | 로컬 bash | 이전 Claude 세션 생성 (0cf9ebd) | ⚠️ 중복 |
| `scripts/specctl.ps1` | 로컬 powershell | 이전 Claude 세션 생성 | ⚠️ 중복 |

### 문제 원인

1. 이전 세션에서 Claude가 공식 `create-docops verify` 존재를 모르고 `specctl` 스크립트 생성
2. 이번 세션에서 `specctl`의 버그 수정에 시간 소요:
   - PowerShell `-LiteralPath` 누락 (Next.js `[id]` 경로 인식 실패)
   - 심볼 매칭 패턴 부족 (destructuring export, Prisma 필드 등)
3. **결과적으로 불필요한 중복 도구 유지보수**

---

## 2. 완료된 작업

### Phase 6: BROKEN_EVIDENCE 수정 ✅

| 지표 | Before | After |
|------|:------:|:-----:|
| SYNC | 27 | **44** |
| BROKEN_EVIDENCE | 33 | **0** |

**수정 내용:**
- `specctl.ps1` 버그 수정 (LiteralPath, 패턴 확장)
- 7개 SPEC 파일의 Evidence 수정
- 커밋: `7f4ad10`, `86273d8`

### pre-commit hook 문제 발견

```
git commit 실행
    ↓
pre-commit hook → npx create-docops verify
    ↓
COVERAGE_MATRIX.md 업데이트 (파일 변경)
    ↓
커밋 완료 후 unstaged 변경 남음 ← 문제!
```

---

## 3. 다음 세션 결정 필요

### 결정 1: specctl 처리 방안

| 옵션 | 장점 | 단점 |
|------|------|------|
| **A. 삭제** | 중복 제거, 유지보수 부담 감소 | 로컬 빠른 검증 불가 |
| **B. 유지** | npm 없이 빠른 검증 가능 | 두 도구 동기화 필요 |
| **C. 공식 도구에 기여** | 근본 해결 | 시간 소요 |

### 결정 2: pre-commit hook 수정

현재 hook이 COVERAGE_MATRIX.md를 변경하지만 staged에 추가하지 않음.

| 옵션 | 내용 |
|------|------|
| **A. 자동 git add** | hook에서 변경된 파일 자동 staged 추가 |
| **B. --no-write 옵션** | 공식 도구에 리포트 스킵 옵션 추가 요청 |
| **C. hook 비활성화** | verify는 수동으로만 실행 |

---

## 4. 파일 위치 요약

| 용도 | 경로 |
|------|------|
| 공식 DocOps | `npx create-docops` (FlowSubAgent 레포) |
| 로컬 스크립트 | `scripts/specctl`, `scripts/specctl.ps1` |
| pre-commit hook | `.git/hooks/pre-commit` |
| 태스크 | `/TASK.md` |

---

## 5. 참조

- FlowSubAgent 레포: https://github.com/flowcoder2025/FlowSubAgent.git
- 공식 verify 코드: `packages/create-docops/src/commands/verify.ts`
- 공식 pre-commit 템플릿: `packages/create-docops/templates/hooks/pre-commit`

---

> **완료**: 2026-01-21 - 역할 분리 완료 (specctl=검증, create-docops=설치)
