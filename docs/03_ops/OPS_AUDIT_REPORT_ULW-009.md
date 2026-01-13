# OPS_AUDIT_REPORT - ULW-009

> 전수 점검 결과 이슈 리스트

**Repository**: FlowSpace (`Team-jane/flow_metaverse`)
**점검 일시**: 2026-01-13
**점검 브랜치**: ops/ulw-009-audit
**베이스 HEAD**: 0e9be38

---

## P0: 즉시 수정

### OPS-001: ANCHOR.md PRD 링크 깨짐

| 항목 | 값 |
|------|-----|
| **증상** | ANCHOR.md에서 PRD 링크 클릭 시 404 |
| **재현** | `docs/03_ops/ANCHOR.md` 라인 15: `[PRD.md](../../PRD.md)` |
| **실제** | 루트에 PRD.md 없음 (`ls PRD.md` → No such file) |
| **기대** | docs/prd.md로 연결 |
| **원인** | 상대 경로 오류. `../../PRD.md`는 루트 상위를 참조함 |
| **해결안** | `../../PRD.md` → `../prd.md` (docs/prd.md) |
| **검증** | 링크 클릭 시 prd.md 정상 로드 |
| **영향 범위** | docs/03_ops/ANCHOR.md 라인 15 |

---

## P1: 다음 세션

### OPS-002: test 스크립트 미구성

| 항목 | 값 |
|------|-----|
| **증상** | `npm test` 실행 시 placeholder만 출력 |
| **재현** | `npm test` → "Tests not configured yet" |
| **실제** | echo + exit 0 |
| **기대** | Jest/Vitest 등 실제 테스트 실행 |
| **원인** | 테스트 프레임워크 미설정 |
| **해결안** | Jest 또는 Vitest 설정 + 기본 테스트 케이스 추가 |
| **검증** | `npm test`에서 실제 테스트 실행 및 PASS |
| **영향 범위** | package.json, 테스트 설정 파일 |

### OPS-003: ESLint unused variable 경고 (11개)

| 항목 | 값 |
|------|-----|
| **증상** | 빌드 시 unused variable 경고 출력 |
| **재현** | `npm run build` |
| **실제** | 11개 경고 (request, _onAdminCommand, _onEditorCommand, _whisperHistory, Users, partyState, switchCameraDevice, partyZones, e x2, eslint-disable) |
| **기대** | 경고 0개 |
| **원인** | 사용되지 않는 변수/import |
| **해결안** | 각 파일에서 unused 제거 또는 _ prefix 추가 |
| **검증** | `npm run build`에서 ESLint 경고 0개 |
| **영향 범위** | 5개 파일 |

---

## P2: 선택

### OPS-004: TODO 주석 (4개)

| 항목 | 값 |
|------|-----|
| **증상** | 코드에 TODO 주석 존재 |
| **파일** | auth.ts(2), admin/layout.tsx(1), SpaceLayout.tsx(1) |
| **내용** | GitHub/Credentials 재활성화, Phase 3 경로 변경, 토스트 알림 |
| **해결안** | 각 TODO 항목을 ROADMAP 또는 이슈로 이동 |
| **우선순위** | LOW (기능 영향 없음) |

### OPS-005: Prisma config deprecated 경고

| 항목 | 값 |
|------|-----|
| **증상** | `package.json#prisma` 설정 deprecated |
| **재현** | `npm run build` |
| **해결안** | prisma.config.ts로 마이그레이션 (Prisma 7 대비) |
| **우선순위** | LOW (현재 동작에 영향 없음) |

---

## 요약

| 우선순위 | 개수 | 상태 |
|----------|------|------|
| **P0** | 1 | ✅ 수정 완료 (OPS-001) |
| **P1** | 2 | 다음 세션 |
| **P2** | 2 | 선택 |

---

## 정상 확인 항목

- [x] typecheck: PASS
- [x] build: PASS (경고만)
- [x] Git hooks: 설치됨 (pre-commit, commit-msg, pre-push)
- [x] migrate-claude-md: 0 changes (idempotent)
- [x] SPEC_SNAPSHOT Verdict: 42afc48 (PASS)
- [x] RUN_LOG: Repo 명시됨, ULW-001~008 기록
