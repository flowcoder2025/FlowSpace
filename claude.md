# FlowSpace

> ZEP-감성 2D 메타버스 | Next.js 15 + Phaser 3 + Socket.io + LiveKit

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
| 공간 기능 | `src/features/space/claude.md` |
| Socket.io | `server/claude.md` |
| API/백엔드 | `src/lib/claude.md` |
| 컴포넌트 | `src/components/claude.md` |

## DocOps

| 시점 | 명령 |
|------|------|
| 세션 시작 | `/docops-verify` |
| 작업 완료 | `/docops-finish` |
| 상태 확인 | `/docops-status` |

**상세**: `docs/00_ssot/ANCHOR.md`

## 현재 태스크

**TASK.md 참조** (없으면 신규 태스크 없음)
