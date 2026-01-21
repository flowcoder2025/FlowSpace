# /docops-finish - 작업 완료

> 코드 작업 완료 후 문서 동기화 및 검증을 수행합니다.

## Trigger
```
/docops-finish [--docs-only] [--skip-push] [--verify-soft]
```

## 동작 흐름

### 전체 워크플로우

```
1. npm run build (빌드 테스트)
2. specctl snapshot (코드 인벤토리 갱신)
3. specctl update (Contract 갱신 제안)
4. specctl verify --level=strict (엄격 검증)
5. specctl compile (산출물 생성)
6. git add + commit (코드+문서)
7. git push
```

### 실제 명령

```bash
npm run flow:finish
# 또는
./scripts/flow-finish
```

## SubAgent 지침

```yaml
role: DocOps Finisher
tools:
  - Bash (flow-finish 실행)
  - Read (결과 확인)
  - AskUserQuestion (실패 시 대응 선택)

workflow:
  1. DocOps 적용 확인 (ANCHOR.md 존재?)
  2. 변경된 파일 확인 (git status)
  3. flow-finish 실행
  4. 성공 시 완료 메시지
  5. 실패 시 원인 분석 + 대응 제안

on_build_fail:
  - "빌드 실패. --docs-only로 문서만 진행할까요?"

on_verify_fail:
  - DRIFT_REPORT 확인
  - 드리프트 항목 표시
  - "드리프트 해결 후 다시 시도하세요."
  - 또는 "--verify-soft로 경고만 하고 진행할까요?"
```

## 출력 예시

### 성공
```
[DocOps Finish] 워크플로우 시작

[1/7] 빌드 테스트...
  ✓ npm run build 성공

[2/7] 코드 인벤토리 갱신...
  ✓ specctl snapshot 완료

[3/7] Contract 갱신 확인...
  ✓ 변경 없음

[4/7] 엄격 검증...
  ✓ specctl verify --level=strict 통과

[5/7] 산출물 생성...
  ✓ specctl compile 완료

[6/7] 커밋...
  ✓ docs 변경 커밋 완료

[7/7] 푸시...
  ✓ main → origin/main 푸시 완료

[DocOps Finish] 완료!
```

### 검증 실패
```
[DocOps Finish] 워크플로우 시작

[1/7] 빌드 테스트...
  ✓ npm run build 성공

[2/7] 코드 인벤토리 갱신...
  ✓ specctl snapshot 완료

[3/7] Contract 갱신 확인...
  ⚠ 새 항목 발견: /api/payments

[4/7] 엄격 검증...
  ✗ specctl verify --level=strict 실패

드리프트 발견:
  - MISSING_DOC: /api/payments (Contract 없음)

선택하세요:
  1. 드리프트 해결 후 재시도
  2. --verify-soft로 경고만 하고 진행
  3. 취소
```

## 옵션

| 옵션 | 설명 |
|------|------|
| `--docs-only` | 빌드 건너뛰기 (문서만 처리) |
| `--skip-push` | 푸시 건너뛰기 (커밋까지만) |
| `--verify-soft` | soft 모드로 검증 (경고만) |

## 사용 시점

```
작업 흐름:
  1. /docops-verify (세션 시작)
  2. 코드 작업...
  3. /docops-finish (작업 완료) ← 여기
```

## 참조

- [flow-finish 스크립트](../../../scripts/flow-finish)
- [DOCOPS_SPEC](../../../docs/00_ssot/) - 최신 스펙 문서 참조
