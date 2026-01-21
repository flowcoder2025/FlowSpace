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

# 검증 (개발 중) - PowerShell
powershell -ExecutionPolicy Bypass -File scripts/specctl.ps1 verify --level=soft

# 검증 (완료 시)
powershell -ExecutionPolicy Bypass -File scripts/specctl.ps1 verify --level=strict

# 전체 워크플로우
npm run flow:finish
```

---

## 도구 역할 분리

| 도구 | 용도 | 명령어 |
|------|------|--------|
| **specctl** (로컬) | 검증/스냅샷/컴파일 | `scripts/specctl.ps1` |
| **create-docops** (npm) | 설치/상태확인 | `npx create-docops` |

> **참고**: specctl은 커스텀 Evidence 형식(백틱 지원)을 사용합니다.
> create-docops verify는 표준 형식만 지원하므로 검증에는 specctl을 사용하세요.

---

## 설치 방법

### 최초 설치 (npm)

```bash
npx create-docops
```

### Skill 기반 (Claude Code)

```bash
/docops-init      # 최초 설치
/docops-verify    # 세션 시작
/docops-finish    # 작업 완료
```

---

## 자동화

### pre-commit hook

git commit 시 `specctl verify --quiet` 자동 실행:
- 드리프트 발견 시 경고 출력 (차단 안 함)
- COVERAGE_MATRIX.md, DRIFT_REPORT.md 자동 staging

### 설정 (`.docopsrc.json`)

```json
{
  "automation": {
    "onFailure": "warn",
    "hooks": { "preCommit": true }
  }
}
```

---

## 참조 문서

| 문서 | 설명 |
|------|------|
| [USER_MANUAL_LATEST.md](../03_standards/manuals/USER_MANUAL_LATEST.md) | 상세 사용법 |
| [DOCOPS_SPEC_V3.2.md](DOCOPS_SPEC_V3.2.md) | 전체 스펙 |

---

> **갱신**: 자동 생성됨 | 버전: npx create-docops --version
