# FlowSpace

> ZEP-감성 2D 메타버스 | Next.js 15 + Phaser 3 + Socket.io + LiveKit

## 응답 규칙

- **응답 언어**: 한글 (코드/명령어/파일명 제외)
- 기술 용어는 영어 허용 (예: API, TypeScript, hook, component)
- 테이블 헤더, 요약, 설명 모두 한글로 작성

## 핵심 원칙

- **Primary Color만 바꾸면 브랜드 완성** (CSS Variables 필수)
- Button: `default`, `outline`만 사용 (예비: `destructive`, `ghost`)
- 한글 하드코딩 금지 → `text-config.ts` 사용

## 금지 사항 (DO NOT)

- ❌ 색상 하드코딩 (`bg-[#xxx]`)
- ❌ SQL 직접 쿼리 (Prisma 사용)
- ❌ 클라이언트에 시크릿 노출
- ❌ 버튼 variant 추가 확장
- ❌ 환경 변수 하드코딩

## 개발 서버

```bash
npm run dev:all    # Next.js(3000) + Socket.io(3001) + LiveKit(7880)
```

## 네비게이터 (상세 규칙 참조)

| 작업 유형 | 참조 문서 |
|----------|----------|
| AI 프로토콜 | `docs/03_standards/specs/AI_PROTOCOL.md` |
| UI 규칙 | `docs/03_standards/specs/UI_COMPONENT.md` |
| 접근성/토큰 | `docs/03_standards/specs/FOUNDATION.md` |
| 공간 API | `docs/03_standards/specs/SPACE.md` |
| Socket.io | `docs/03_standards/specs/SOCKET.md` |
| 게임 엔진 | `docs/03_standards/specs/GAME.md` |
| LiveKit | `docs/03_standards/specs/LIVEKIT.md` |
| OCI 인프라 | `docs/03_standards/specs/INFRA.md` |
| OCI 배포 상세 | `docs/infrastructure/OCI.md` |

## DocOps

| 시점 | 명령 |
|------|------|
| 세션 시작 | `/docops-verify` |
| 작업 완료 | `/docops-finish` |
| 상태 확인 | `/docops-status` |

**상세**: `docs/00_ssot/ANCHOR.md`

### DocOps 문서화 규칙 (필수)

1. **SSOT 폴더 (`docs/00_ssot/`)에 임의 파일 생성 금지**
   - 허용 파일: `ANCHOR.md`, `COVERAGE_MATRIX.md`, `DRIFT_REPORT.md`, `DOC_DEBT.md`, `SPEC_SNAPSHOT.md`, `DOC_POLICY.md`, `DOCOPS_SPEC_V3.2.md`, `AGENT_GUIDE.md`
   - CHANGELOG, HANDOFF 등 임의 문서 생성 ❌

2. **변경 이력은 해당 Spec 문서에 기록**
   - 위치: `docs/03_standards/specs/<SPEC_KEY>.md` → "변경 이력" 섹션
   - 형식: `| 날짜 | 요약 | 커밋 |`

3. **Evidence 없는 Contract 금지**
   - 모든 Contract는 `code:`, `ui:`, `test:` 등 Evidence 필수

## 현재 태스크

**TASK.md 참조** (없으면 신규 태스크 없음)
