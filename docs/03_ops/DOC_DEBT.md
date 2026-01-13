# Document Debt Tracker

> 문서 부채 추적 및 관리

## 현재 부채 목록

| ID | Feature | Description | Priority | Owner | Due (optional) |
|----|---------|-------------|----------|-------|----------------|
| - | - | (부채 없음) | - | - | - |

## Priority 정의

| Priority | 설명 | 처리 기한 |
|----------|------|-----------|
| HIGH | 기능 동작에 직접 영향 / 사용자 혼란 유발 | 다음 릴리즈 전 |
| MEDIUM | 개발자 온보딩/유지보수에 영향 | 2주 내 |
| LOW | 개선사항 / 참고용 | 백로그 |

## 부채 등록 규칙

1. doc-manager가 PRD Sync: NEEDS_UPDATE 출력 시 자동 등록
2. 코드 리뷰에서 문서 누락 발견 시 수동 등록
3. Owner는 git author + commit hash로 자동 기입

## 부채 해소 절차

1. 해당 Feature ID 문서 작성/수정
2. PRD.md 동기화 (필요 시)
3. 이 테이블에서 해당 행 삭제
4. 커밋 메시지에 `DOC_DEBT resolved: <ID>` 포함

## DRIFT_REPORT 연계

드리프트(PRD ↔ 코드 불일치) 해결에 문서 수정이 필요할 경우:

| ID 형식 | 원본 | 설명 |
|---------|------|------|
| `DEBT-DRIFT-XXX` | DRIFT-XXX | 드리프트 해결을 위한 문서 수정 |
| `DEBT-LEGACY-XXX` | 레거시 docs | 레거시 문서 마이그레이션 |

→ [DRIFT_REPORT.md](DRIFT_REPORT.md) 참조
