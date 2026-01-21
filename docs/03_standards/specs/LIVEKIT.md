# LIVEKIT - LiveKit API 스펙

> WebRTC 음성/영상 통화 서비스 API

---

## 개요

LiveKit 토큰 발급 및 웹훅 처리 API

---

<!-- FUNCTIONAL:BEGIN -->

### Contract: LIVEKIT_API_TOKEN

- **What**: LiveKit 룸 토큰 발급 API
- **Evidence**:
  - code: `src/app/api/livekit/token/route.ts::POST`
  - code: `src/app/api/livekit/token/route.ts::removeDuplicateParticipants`
  - code: `src/app/api/livekit/token/route.ts::AccessToken`

### Contract: LIVEKIT_API_WEBHOOK

- **What**: LiveKit 웹훅 처리 API
- **Evidence**:
  - code: `src/app/api/livekit/webhook/route.ts::POST`

<!-- FUNCTIONAL:END -->

---

## 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/livekit/token` | 토큰 발급 |
| POST | `/api/livekit/webhook` | 웹훅 수신 |

---

## 토큰 발급 로직

1. 사용자 인증 확인 (인증 사용자 or 게스트)
2. 세션 토큰 검증 (게스트인 경우)
3. 중복 참가자 정리 (세션 전환 시)
4. AccessToken 생성 및 반환

---

## 환경 변수

| 변수 | 설명 |
|------|------|
| `LIVEKIT_API_KEY` | LiveKit API 키 |
| `LIVEKIT_API_SECRET` | LiveKit API 시크릿 |
| `LIVEKIT_URL` | LiveKit 서버 URL |

---

## 참조

- Provider: `src/features/space/livekit/LiveKitRoomProvider.tsx`
- Context: `src/features/space/livekit/LiveKitMediaContext.tsx`

---

> **생성일**: 2026-01-21 DocOps Phase 2
