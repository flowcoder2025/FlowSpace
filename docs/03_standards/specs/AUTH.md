# AUTH - 인증 API 스펙

> 사용자 인증 및 세션 관리 API

---

## 0. 요약

- **목적**: 사용자 인증 및 세션 관리
- **범위**: OAuth 로그인 (Google, GitHub), 이메일/비밀번호 가입, 동의 관리
- **비범위**: 소셜 프로필 동기화, 2FA (향후 확장)

---

<!-- FUNCTIONAL:BEGIN -->

### Contract: AUTH_API_NEXTAUTH

- **Tier**: core
- **What**: NextAuth.js OAuth 인증 엔드포인트 (Google, GitHub)
- **Rules**:
  | 제공자 | 콜백 URL | 스코프 |
  |--------|----------|--------|
  | Google | `/api/auth/callback/google` | email, profile |
  | GitHub | `/api/auth/callback/github` | read:user, user:email |
- **Evidence**:
  - code: `src/app/api/auth/[...nextauth]/route.ts::GET`
  - code: `src/app/api/auth/[...nextauth]/route.ts::POST`
  - code: `src/lib/auth.ts::auth`

### Contract: AUTH_API_REGISTER

- **Tier**: core
- **What**: 이메일/비밀번호 회원가입 API
- **Rules**:
  | 필드 | 검증 |
  |------|------|
  | email | 유효한 이메일 형식 |
  | password | 최소 8자, 영문+숫자 조합 |
  | name | 2-20자 |
- **Evidence**:
  - code: `src/app/api/auth/register/route.ts::POST`
  - code: `src/app/api/auth/register/route.ts::validateEmail`
  - code: `src/app/api/auth/register/route.ts::validatePassword`

### Contract: AUTH_API_USER_CONSENT

- **Tier**: normal
- **What**: 사용자 동의(녹화 등) 관리 API
- **Evidence**:
  - code: `src/app/api/user/consent/route.ts::POST`
  - code: `prisma/schema.prisma`

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

## 변경 이력

| 날짜 | 요약 | 커밋 |
|------|------|------|
| 2026-01-22 | B등급 보강: 요약 섹션, Tier/Rules 추가, 변경 이력 섹션 추가 | - |
| 2026-01-21 | 초기 작성 (DocOps Phase 2) | - |
