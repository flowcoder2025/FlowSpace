# TASK: Middleware 번들 사이즈 최적화 (Option A)

> **상태**: ✅ 완료
> **시작일**: 2025-12-17
> **완료일**: 2025-12-17
> **범위**: Middleware 제거 + 클라이언트 동의 모달

---

## 🎯 문제 원인

```
Middleware: 140KB → Vercel Edge Runtime 제한에 근접

// middleware.ts
import { auth } from "@/lib/auth"  // ← 문제!

// auth.ts가 가져오는 것들:
import { PrismaAdapter } from "@auth/prisma-adapter"  // 무거움
import { prisma } from "./prisma"  // Prisma Client 전체 (~100KB+)
```

Prisma Client는 Edge Runtime에 최적화되지 않아 번들이 폭발합니다.

---

## ✅ 해결 방안: Option A (권장)

```
┌─────────────────────────────────────────┐
│  사용자 로그인                           │
│       ↓                                 │
│  JWT에 agreedToRecording 포함           │
│       ↓                                 │
│  보호된 페이지 Layout에서 체크           │
│       ↓                                 │
│  동의 안됨? → 모달 표시 (같은 페이지)    │
│       ↓                                 │
│  동의 클릭 → API 호출 → 세션 갱신        │
└─────────────────────────────────────────┘
```

### 장점
- ✅ Middleware 삭제 → 번들 0KB
- ✅ 별도 onboarding 페이지 불필요
- ✅ DB 쿼리 최소화 (로그인 1회 + 동의 1회)

---

## 📋 구현 체크리스트

- [x] middleware.ts 삭제 → Edge Runtime 문제 해결
- [x] ConsentModal.tsx 생성 → 인라인 동의 모달
- [x] ProtectedLayout.tsx 수정 → 모달 호출 (리다이렉트 X)
- [x] 빌드 테스트 통과

---

## 📁 변경 파일

| 파일 | 변경 내용 |
|-----|----------|
| `src/middleware.ts` | 삭제 (번들 0KB) |
| `src/components/ConsentModal.tsx` | 신규 생성 (인라인 동의 모달) |
| `src/components/ProtectedLayout.tsx` | 수정 (모달 호출 방식) |

---

## 📊 결과 비교

| 항목 | 변경 전 | 변경 후 |
|-----|--------|--------|
| Middleware 크기 | 140KB | 0KB |
| 동의 UI | /onboarding 리다이렉트 | 인라인 모달 |
| 복잡도 | 높음 | 낮음 |
| UX | 페이지 이동 | 같은 페이지 |

---

## 변경 이력

| 날짜 | 내용 |
|-----|------|
| 2025-12-17 | TASK.md 초기화 - Option A 구현 완료 |
