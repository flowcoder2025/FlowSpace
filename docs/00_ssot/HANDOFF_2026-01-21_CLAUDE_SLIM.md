# HANDOFF - CLAUDE.md 슬림화 및 DocOps 통합

> **세션 핸드오프 문서**
> **작성일**: 2026-01-21
> **상태**: ⏳ 진행중

---

## 1. 배경 및 근거

### 1.1 PDF 권장사항 (Claude Code 완전가이드 70가지 팁)

**ykdojo Tip #30**: "CLAUDE.md는 간결하게 유지"
> "처음에는 CLAUDE.md 없이 시작하세요. 같은 말을 반복하게 되면 그때 추가하세요.
> 과도한 정보는 컨텍스트를 낭비합니다."

**좋은 예시**:
```markdown
## Authentication
- NextAuth.js with Credentials provider
- JWT session strategy
- **DO NOT**: Bypass auth checks, expose session secrets
```

**나쁜 예시**:
```markdown
Our authentication system is built using NextAuth.js, which is a complete...
(수백 단어의 장황한 설명)
```

### 1.2 현재 문제점

| 항목 | 현재 | 문제 |
|------|------|------|
| CLAUDE.md | 660줄 (~19k 토큰) | 컨텍스트 낭비 |
| DocOps 연동 | 부분적 | SPEC과 중복/충돌 |
| 세션 유지 | 어려움 | 토큰 소진 빠름 |

---

## 2. 분석 결과

### 2.1 CLAUDE.md ↔ DocOps 충돌 매핑

| CLAUDE.md 섹션 | DocOps 문서 | 상태 |
|---------------|-------------|------|
| §0.7 AI 작업 프로토콜 | AI_PROTOCOL.md (신규 필요) | **충돌** |
| §6 응답 & 문서 정책 | DOC_POLICY.md | **중복** |
| §4.5 접근성 상세 | FOUNDATION.md (업데이트 필요) | **누락** |
| §4.2 버튼 상세 규칙 | UI_COMPONENT.md (업데이트 필요) | **누락** |
| §3 디렉토리 구조 | ARCH.md Evidence | **중복** |

### 2.2 분리 대상

| 현재 CLAUDE.md 섹션 | 이동 위치 | Evidence 유형 |
|-------------------|----------|--------------|
| §0.5-0.7 TASK/AI 프로토콜 | AI_PROTOCOL.md (신규) | code: skill 파일 |
| §4.2 버튼 상세 규칙 | UI_COMPONENT.md | ui: Button.tsx |
| §4.5 접근성 상세 | FOUNDATION.md | code: 접근성 코드 |
| §3 디렉토리 구조 | ARCH.md Evidence | code: glob 결과 |
| §6 문서 정책 | DOC_POLICY.md (기존) | - |

---

## 3. 목표 구조

### 3.1 CLAUDE.md (슬림화 후 ~50줄)

```markdown
# FlowSpace

> ZEP-감성 2D 메타버스 | Next.js 15 + Phaser 3 + Socket.io + LiveKit

## 핵심 원칙
- Primary Color만 바꾸면 브랜드 완성 (CSS Variables 필수)
- Button: `default`, `outline`만 사용 (예비: `destructive`, `ghost`)
- 한글 하드코딩 금지 → `text-config.ts` 사용

## 금지 사항 (DO NOT)
- 색상 하드코딩 (`bg-[#xxx]`)
- SQL 직접 쿼리 (Prisma 사용)
- 클라이언트에 시크릿 노출
- 버튼 variant 추가 확장

## 개발 서버
`npm run dev:all` (포트: 3000, 3001, 7880)

## 네비게이터 (상세 규칙 참조)

| 작업 유형 | 참조 문서 |
|----------|----------|
| AI 프로토콜 | `docs/03_standards/specs/AI_PROTOCOL.md` |
| UI 규칙 | `docs/03_standards/specs/UI_COMPONENT.md` |
| 접근성 | `docs/03_standards/specs/FOUNDATION.md` |
| 공간 기능 | `src/features/space/claude.md` |
| Socket.io | `server/claude.md` |

## DocOps
세션 시작: `/docops-verify` | 작업 완료: `/docops-finish`
상세: `docs/00_ssot/ANCHOR.md`
```

### 3.2 DocOps SPEC 구조

```
docs/03_standards/specs/
├── AI_PROTOCOL.md     ← 신규 (AI 작업 프로토콜)
├── UI_COMPONENT.md    ← 업데이트 (버튼 Hover 규칙 추가)
├── FOUNDATION.md      ← 업데이트 (모달 접근성 추가)
├── ARCH.md            ← 기존 유지
├── PERMISSION.md      ← 기존 유지
├── INFRA.md           ← 기존 유지
├── UI_SYSTEM.md       ← 기존 유지
├── AUTH.md            ← 기존 유지
├── SPACE.md           ← 기존 유지
├── ADMIN.md           ← 기존 유지
├── DASHBOARD.md       ← 기존 유지
├── USER.md            ← 기존 유지
├── GUEST.md           ← 기존 유지
├── LIVEKIT.md         ← 기존 유지
└── CRON.md            ← 기존 유지
```

---

## 4. 작업 계획

### Phase 1: DocOps SPEC 이전

1. **AI_PROTOCOL.md 생성** (신규)
   - AI_PROTOCOL_FUNC_SESSION_START
   - AI_PROTOCOL_FUNC_TASK_MANAGEMENT
   - AI_PROTOCOL_FUNC_CODE_DOC_SYNC
   - AI_PROTOCOL_FUNC_VERIFICATION

2. **UI_COMPONENT.md 업데이트**
   - UI_COMPONENT_DESIGN_BUTTON_HOVER (신규)

3. **FOUNDATION.md 업데이트**
   - FOUNDATION_DESIGN_A11Y_MODAL (신규)
   - FOUNDATION_DESIGN_STATE_MACHINE (신규)

### Phase 2: CLAUDE.md 슬림화

1. 핵심 원칙만 남기고 상세 삭제
2. 네비게이터 섹션으로 참조 연결
3. 660줄 → 50줄 축소

### Phase 3: 검증 및 마무리

1. specctl verify 통과
2. COVERAGE_MATRIX.md 업데이트
3. git commit & push

---

## 5. 예상 결과

| 항목 | Before | After |
|------|:------:|:-----:|
| CLAUDE.md 줄 수 | 660 | ~50 |
| 컨텍스트 토큰 | ~19k | ~1k |
| DocOps Contract 수 | 68 | 75+ |
| SYNC 상태 | 68 | 75+ |

---

## 6. 다음 세션 시작 시

```bash
# 1. TASK.md 확인
cat TASK.md

# 2. 현재 Phase 확인 후 이어서 진행
# 3. DocOps 검증
/docops-verify
```

---

> **갱신**: 2026-01-21
