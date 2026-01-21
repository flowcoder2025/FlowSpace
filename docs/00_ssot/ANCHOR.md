# ANCHOR - DocOps 진입점

> 모든 세션/작업 시작 시 이 문서를 먼저 읽으세요.

---

## 목표

**할루시네이션/드리프트를 0%에 수렴**시키고 **누락 없는 문서**를 만든다.

---

## SSOT (Single Source of Truth)

| 문서 | 역할 | 경로 |
|------|------|------|
| **DOC_POLICY** | 문서 규칙 | [DOC_POLICY.md](DOC_POLICY.md) |
| **COVERAGE_MATRIX** | 현황판 (누락/할루/동기화) | [COVERAGE_MATRIX.md](COVERAGE_MATRIX.md) |
| **SPEC_SNAPSHOT** | 코드 인벤토리 | [SPEC_SNAPSHOT.md](SPEC_SNAPSHOT.md) |
| **DRIFT_REPORT** | 검증 실패 기록 | [DRIFT_REPORT.md](DRIFT_REPORT.md) |
| **DOC_DEBT** | 미해결 큐 | [DOC_DEBT.md](DOC_DEBT.md) |
| **AGENT_GUIDE** | 에이전트 적용 가이드 | [AGENT_GUIDE.md](AGENT_GUIDE.md) |
| **DOCOPS_SPEC** | 3.2 전체 스펙 | [DOCOPS_SPEC_V3.2.md](DOCOPS_SPEC_V3.2.md) |

---

## 핵심 규칙 (3줄 요약)

1. **Evidence 없는 Contract 금지** - 근거 없는 문서 = 할루시네이션
2. **Snapshot ↔ Contract 매핑** - 누락/할루를 기계적으로 탐지
3. **verify PASS 없이 완료 금지** - flow:finish에서 strict 검증

---

## 워크플로우

### 세션 시작
```
1. ANCHOR.md 읽기 (이 문서)
2. COVERAGE_MATRIX.md 확인 (현재 상태)
3. DRIFT_REPORT.md 확인 (해결 필요 항목)
```

### 작업 중
```
1. 코드 구현
2. Contract 작성 (Evidence 필수)
3. specctl verify --level=soft (개발 중 검증)
```

### 작업 완료
```
npm run flow:finish

내부 동작:
1. npm run build
2. specctl snapshot
3. specctl update
4. specctl verify --level=strict
5. specctl compile
6. 커밋 + 푸시
```

---

## Spec 문서 위치

| 경로 | 용도 |
|------|------|
| `docs/03_standards/specs/<SPEC_KEY>.md` | 기능 단위 문서 |
| `docs/03_standards/devspec/` | 개발사양서 (자동 생성) |
| `docs/03_standards/manuals/` | 사용자 매뉴얼 (자동 생성) |
| `docs/02_decisions/` | ADR (의사결정 기록) |
| `docs/05_archive/` | 과거 버전 |

---

## 상태 정의

| 상태 | 의미 | 조치 |
|------|------|------|
| **SYNC** | 완벽 | 없음 |
| **MISSING_DOC** | 코드O 문서X | Contract 추가 |
| **HALLUCINATION** | 코드X 문서O | Contract 삭제 또는 코드 추가 |
| **BROKEN_EVIDENCE** | 링크 깨짐 | Evidence 수정 |
| **SNAPSHOT_GAP** | 자동화 범위 밖 | 점진적 확장 |

---

## 빠른 참조

```bash
# 현황 확인
cat docs/00_ssot/COVERAGE_MATRIX.md

# 검증 (개발 중)
specctl verify --level=soft

# 검증 (완료 시)
specctl verify --level=strict

# 전체 워크플로우
npm run flow:finish
```

---

## 설치 방법

### npm CLI (권장)

```bash
# DocOps 설치
npx create-docops

# 업데이트
npx create-docops --update
```

### Skill 기반 (Claude Code)

```bash
/docops-init      # 최초 설치
/docops-verify    # 세션 시작
/docops-finish    # 작업 완료
```

---

## 자동화 (v3.2.0+)

DocOps는 설치 시 자동 검증을 설정합니다:

| 시점 | 동작 | 설정 |
|------|------|------|
| **git commit** | pre-commit hook으로 verify 실행 | `.git/hooks/pre-commit` |
| **npm run dev** | predev script로 verify 실행 | `package.json` (선택) |
| **npm run build** | prebuild script로 verify 실행 | `package.json` (선택) |

### 설정 변경

`.docopsrc.json`의 `automation` 섹션:

```json
{
  "automation": {
    "onFailure": "warn",  // "strict" 또는 "warn"
    "hooks": {
      "preCommit": true,
      "preDev": false,
      "preBuild": false
    }
  }
}
```

### 드리프트 발견 시 동작

- **warn**: 경고만 출력하고 계속 진행
- **strict**: 커밋/빌드 차단 (드리프트 해결 필요)

---

## 참조 문서

| 문서 | 설명 |
|------|------|
| [USER_MANUAL_LATEST.md](../03_standards/manuals/USER_MANUAL_LATEST.md) | 상세 사용법 |
| [DOCOPS_SPEC_V3.2.md](DOCOPS_SPEC_V3.2.md) | 전체 스펙 |

---

> **갱신**: 자동 생성됨 | 버전: npx create-docops --version
