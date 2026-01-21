# AUTH - 인증 API 스펙

> 사용자 인증 및 세션 관리 API

---

## 개요

NextAuth.js 기반 인증 시스템 - OAuth 및 Credentials 로그인 지원

---

<!-- FUNCTIONAL:BEGIN -->

### Contract: AUTH_API_NEXTAUTH

- **What**: NextAuth.js OAuth 인증 엔드포인트 (Google, GitHub)
- **Evidence**:
  - code: `src/app/api/auth/[...nextauth]/route.ts::GET`
  - code: `src/app/api/auth/[...nextauth]/route.ts::POST`
  - code: `src/lib/auth.ts::auth`

### Contract: AUTH_API_REGISTER

- **What**: 이메일/비밀번호 회원가입 API
- **Evidence**:
  - code: `src/app/api/auth/register/route.ts::POST`
  - code: `src/app/api/auth/register/route.ts::validateEmail`
  - code: `src/app/api/auth/register/route.ts::validatePassword`

### Contract: AUTH_API_USER_CONSENT

- **What**: 사용자 동의(녹화 등) 관리 API
- **Evidence**:
  - code: `src/app/api/user/consent/route.ts::POST`
  - code: `prisma/schema.prisma::agreedToRecording`

<!-- FUNCTIONAL:END -->

---

## 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| GET/POST | `/api/auth/[...nextauth]` | NextAuth.js 핸들러 |
| POST | `/api/auth/register` | 회원가입 |
| POST | `/api/user/consent` | 동의 관리 |

---

## 참조

- NextAuth.js: `src/lib/auth.ts`
- Prisma User: `prisma/schema.prisma::User`

---

> **생성일**: 2026-01-21 DocOps Phase 2
