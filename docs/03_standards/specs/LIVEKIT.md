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

### Contract: LIVEKIT_COMP_PROVIDER

- **What**: LiveKitRoomProvider 토큰 페칭 + 컨텍스트
- **Evidence**:
  - code: `src/features/space/livekit/LiveKitRoomProvider.tsx`
  - code: `src/features/space/livekit/LiveKitMediaContext.tsx`

### Contract: LIVEKIT_HOOK_MEDIA

- **What**: useLiveKitMedia 컨텍스트 기반 미디어 제어
- **Evidence**:
  - code: `src/features/space/livekit/useLiveKitMedia.ts`
  - code: `src/features/space/livekit/useLiveKit.ts`

### Contract: LIVEKIT_HOOK_AUDIO

- **What**: useAudioSettings 오디오 설정 관리
- **Rules**:
  | 옵션 | 기본값 | LiveKit 옵션 |
  |-----|-------|--------------|
  | noiseSuppression | true | AudioCaptureOptions.noiseSuppression |
  | echoCancellation | true | AudioCaptureOptions.echoCancellation |
  | autoGainControl | true | AudioCaptureOptions.autoGainControl |
  | voiceIsolation | false | 실험적 기능 |
- **Evidence**:
  - code: `src/features/space/hooks/useAudioSettings.ts`

### Contract: LIVEKIT_HOOK_VIDEO

- **What**: useVideoSettings 비디오 설정 관리
- **Rules**:
  | 프리셋 | 해상도 | 용도 |
  |-------|-------|------|
  | 480p | 640x480 | 저대역폭 |
  | 720p | 1280x720 | 기본 (권장) |
  | 1080p | 1920x1080 | 고화질 |
- **Evidence**:
  - code: `src/features/space/hooks/useVideoSettings.ts`

### Contract: LIVEKIT_HOOK_VOLUME

- **What**: useVolumeMeter Web Audio API 실시간 볼륨 측정
- **Evidence**:
  - code: `src/features/space/hooks/useVolumeMeter.ts`

### Contract: LIVEKIT_HOOK_DEVICES

- **What**: useMediaDevices 미디어 장치 관리
- **Rules**:
  - Option C: 지연된 권한 요청 (iOS Safari 호환)
  - 마운트 시 getUserMedia 호출 안함
  - 설정 열 때 requestPermission() 호출
- **Evidence**:
  - code: `src/features/space/hooks/useMediaDevices.ts`

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

## 배포 환경 (OCI 셀프호스팅)

| 환경 | URL | IP |
|------|-----|-----|
| Production | `wss://space-livekit.flow-coder.com` | OCI 144.24.72.143 |
| Development | `ws://localhost:7880` | - |

> Railway/LiveKit Cloud 사용 안함 - Oracle Cloud에서 셀프호스팅
> 상세 OCI 배포 가이드: `docs/infrastructure/OCI.md`

---

## 참조

- Provider: `src/features/space/livekit/LiveKitRoomProvider.tsx`
- Context: `src/features/space/livekit/LiveKitMediaContext.tsx`
- 인프라: `docs/03_standards/specs/INFRA.md`

---

> **생성일**: 2026-01-21 DocOps Phase 2
