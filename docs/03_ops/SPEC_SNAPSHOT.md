# SPEC_SNAPSHOT - SSOT 스냅샷

> 현재 시점의 SSOT(PRD/AGENTS/Policy) 핵심 요약 스냅샷

## 메타데이터

| 항목 | 값 |
|------|-----|
| **Snapshot Date** | 2026-01-13 |
| **PRD Version** | v0.6 (2026-01-08) |
| **Profile** | Pro |
| **Owner** | Claude (git author) |
| **Last Verifier** | verifier (ULW-007 SSOT 보강) |
| **Status** | PASS |
| **Last Verdict Commit** | 42afc48 (migrate-claude-md SSOT 최종) |

### Status 정의

| Status | 의미 |
|--------|------|
| **PASS** | 마지막 codex-verifier Verdict=PASS 근거 존재 |
| **FAIL** | 마지막 codex-verifier Verdict=FAIL |
| **UNKNOWN** | codex-verifier 미실행 또는 근거 없음 |

**Last Verdict Evidence Location**: `docs/DECISIONS.md`

근거 형식:
```
codex-verifier: PASS|FAIL (commit <hash>) (evidence: <link/path>)
```

---

## PRD 핵심 요약

### 프로젝트 목적
ZEP-감성 2D 메타버스 MVP - Phaser 3 + Socket.io + LiveKit 기반 자체 개발 플랫폼

### 기술 스택
| 영역 | 기술 |
|------|------|
| Frontend | Next.js 15 + React 19 + TypeScript |
| Game Engine | Phaser 3 |
| Real-time | Socket.io |
| Video/Voice | LiveKit |
| Database | Supabase PostgreSQL + Prisma |
| Auth | NextAuth.js |
| Deploy | Vercel (웹), OCI (Socket/LiveKit) |

### 핵심 기능 (Feature IDs)
| ID | 기능 | 상태 |
|----|------|------|
| FR-Auth | 게스트/소셜 로그인 | ✅ 완료 |
| FR-Space | 공간 생성/관리/초대 | ✅ 완료 |
| FR-Template | 3종 템플릿 (맵+타일셋+오브젝트) | ⏳ 에셋 대기 |
| FR-Admin | 운영자 대시보드 (지표/CSV) | ✅ 완료 |
| FR-Brand | 로고/컬러/로딩 화면 | ✅ 완료 |
| Phase-1 | 기반 UI | ✅ 완료 |
| Phase-2 | 게임 엔진 (Phaser 3) | ✅ 완료 |
| Phase-3 | 멀티플레이어 (Socket.io) | ✅ 완료 |
| Phase-4 | 음성/영상 (LiveKit) | ✅ 완료 |
| Phase-5 | 통합 및 Polish + 공간 기반 커뮤니케이션 | ✅ 완료 |
| Phase-6 | 권한/보안 (95%) + 운영 도구 (OCI/Cron) | ✅ 완료 |
| Phase-7 | 인프라 최적화 | 📋 계획 |
| Phase-8 | 에셋 완성 | 📋 대기 |

### 완료 조건
1. codex-verifier: **PASS**
2. doc-manager: 문서 반영 완료
3. context-keeper: RESUME_PACK.md 갱신

---

## 에이전트 요약 (FlowSubAgent)

### Core (4개)
- doc-manager: 문서 관리 (PRD Sync)
- codex-verifier: 최종 PASS/FAIL 판정
- runner: typecheck/test/build 실행
- verifier: 근거 수집 (판정 금지)

### Pro (7개 추가)
- explore: 빠른 탐색 (haiku)
- librarian: 근거 수집/요약
- implementer: 코드 구현 (**Write 전담**)
- context-keeper: Resume Pack 갱신
- security-license: 보안/라이선스 스캔
- spec-acceptance: AC 초안 작성
- main-orchestrator: 플레이북/체크리스트

---

## 인프라 배포 상태

| 서비스 | 플랫폼 | 도메인 | 상태 |
|--------|--------|--------|------|
| Next.js (웹) | Vercel | flow-space.vercel.app | ✅ |
| Socket.io | OCI Docker | space-socket.flow-coder.com | ✅ |
| LiveKit | OCI Docker | space-livekit.flow-coder.com | ✅ |
| PostgreSQL | Supabase | - | ✅ |

---

## 정책 요약

### 커밋 메시지
```
<TAG>: <한국어 요약>
```
TAG: feat, fix, refactor, chore, docs, ops

### 문서 정책 (Overlay)
- **Write 허용**: docs/03_ops/**, docs/04_reference/**, PRD.md
- **Read-only**: 기존 레거시 docs/**

### 참조 수렴
- 세션 시작 → ANCHOR.md → 각 SSOT 문서

---

## 변경 이력

| 날짜 | 변경 내용 | 담당 |
|------|----------|------|
| 2026-01-13 | FlowSpace PRD v0.6 기반 스냅샷 | Claude |
| 2026-01-13 | P1 마이그레이션 완료, Status→PASS, Commit→4024e8d | Claude |
| 2026-01-13 | ULW-007 SSOT 보강 최종 PASS, Commit→42afc48 | Claude |

---

## 갱신 규칙

### 갱신 시점
- 주요 기능 완료 (Feature ID 추가/변경)
- 릴리즈 태그 생성 전
- codex-verifier PASS 획득 후

### 갱신 항목별 규칙

| 항목 | 갱신 규칙 | 담당 |
|------|----------|------|
| **Snapshot Date** | 갱신 시점 날짜 (YYYY-MM-DD) | doc-manager |
| **PRD Version** | PRD.md의 Version 필드와 동기화 | doc-manager |
| **Owner** | `git log -1 --format='%an'` (마지막 커밋 author) | 자동 |
| **Status** | codex-verifier Verdict 결과 (PASS/FAIL/UNKNOWN) | codex-verifier 후 |

### 갱신 담당
- **doc-manager**: PRD 변경 시 동기화
- **context-keeper**: 세션 종료 시 Resume Pack과 함께 갱신
