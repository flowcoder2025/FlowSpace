# LIVEKIT - LiveKit API 스펙

> WebRTC 음성/영상 통화 서비스 API

---

## 0. 요약

- **목적**: 실시간 음성/영상 통신 (WebRTC) 기능 제공
- **범위**: 토큰 발급, 미디어 트랙 관리, 오디오/비디오 설정, 근접 통신
- **비범위**: 녹화/재생 (향후 확장), SFU 서버 설정 (INFRA.md 참조)

---

<!-- FUNCTIONAL:BEGIN -->

### Contract: LIVEKIT_API_TOKEN

- **Tier**: core
- **What**: LiveKit 룸 토큰 발급 API
- **Inputs/Outputs**:
  - Input: `{ roomName: string, userId: string, isGuest?: boolean }`
  - Output: `{ token: string }` | Error
- **Errors**:
  - `UNAUTHORIZED`: 인증 실패
  - `MISSING_ROOM`: roomName 누락
- **Rules**:
  | 규칙 | 설명 |
  |------|------|
  | 중복 참가자 정리 | 동일 userId로 재입장 시 기존 참가자 제거 |
  | 게스트 토큰 | isGuest=true 시 세션 토큰 검증 필요 |
  | 토큰 TTL | 기본 24시간 |
- **Evidence**:
  - code: `src/app/api/livekit/token/route.ts::POST`
  - code: `src/app/api/livekit/token/route.ts::removeDuplicateParticipants`
  - code: `src/app/api/livekit/token/route.ts::AccessToken`

### Contract: LIVEKIT_API_WEBHOOK

- **Tier**: normal
- **What**: LiveKit 웹훅 처리 API
- **Inputs/Outputs**:
  - Input: `WebhookEvent (participant_joined, track_published, etc.)`
  - Output: `200 OK` | Error
- **Rules**:
  | 이벤트 | 처리 |
  |--------|------|
  | participant_joined | 입장 로그 기록 |
  | participant_left | 퇴장 로그 기록 |
  | track_published | 트랙 발행 처리 |
- **Evidence**:
  - code: `src/app/api/livekit/webhook/route.ts::POST`

### Contract: LIVEKIT_COMP_PROVIDER

- **Tier**: core
- **What**: LiveKitRoomProvider 토큰 페칭 + 컨텍스트
- **Rules**:
  | 규칙 | 설명 |
  |------|------|
  | 자동 재연결 | 연결 끊김 시 자동 재시도 (최대 3회) |
  | 토큰 갱신 | 만료 5분 전 자동 갱신 |
- **Evidence**:
  - code: `src/features/space/livekit/LiveKitRoomProvider.tsx`
  - code: `src/features/space/livekit/LiveKitMediaContext.tsx`

### Contract: LIVEKIT_HOOK_MEDIA

- **Tier**: core
- **What**: useLiveKitMedia 컨텍스트 기반 미디어 제어
- **Rules**:
  | 메서드 | 설명 |
  |--------|------|
  | toggleMic() | 마이크 ON/OFF |
  | toggleCamera() | 카메라 ON/OFF |
  | shareScreen() | 화면 공유 시작/중지 |
  | setAudioDevice(id) | 오디오 장치 변경 |
  | setVideoDevice(id) | 비디오 장치 변경 |
- **Evidence**:
  - code: `src/features/space/livekit/useLiveKitMedia.ts`
  - code: `src/features/space/livekit/useLiveKit.ts`

### Contract: LIVEKIT_HOOK_AUDIOGATE

- **Tier**: core
- **What**: useAudioGateProcessor AudioWorklet 기반 노이즈 게이트
- **Rules**:
  | 파라미터 | 기본값 | 설명 |
  |----------|--------|------|
  | sensitivity | 0 (OFF) | 입력 감도 (0-100, 낮을수록 민감) |
  | attackTime | 0.01s | 게이트 열림 속도 |
  | releaseTime | 0.1s | 게이트 닫힘 속도 |

  | 상태 | 동작 |
  |------|------|
  | sensitivity = 0 | AudioWorklet 파이프라인 미생성 (원본 트랙 사용) |
  | sensitivity > 0 | 노이즈 게이트 활성화 |
  | 0 ↔ non-zero 전환 | 파이프라인 생성/정리, 트랙 교체 |
- **Evidence**:
  - code: `src/features/space/hooks/useAudioGateProcessor.ts::useAudioGateProcessor`
  - code: `public/audio-worklets/noise-gate-processor.js`

### Contract: LIVEKIT_FUNC_TRACK_REPLACE

- **Tier**: core
- **What**: sensitivity 전환 시 트랙 교체 메커니즘
- **Rules**:
  | 전환 | 동작 |
  |------|------|
  | sensitivity: 0 → non-zero | processedTrack 생성, LiveKit에 발행 |
  | sensitivity: non-zero → 0 | processedTrack 정리, 원본 트랙 복원 |
  | 동일 range (예: 30→50) | 파이프라인 유지, threshold만 업데이트 |

  **중요**: 0↔non-zero 전환 시에만 파이프라인 재생성. 값 변경(예: 30→50)은 워커에 메시지만 전송
- **Evidence**:
  - code: `src/features/space/livekit/LiveKitMediaContext.tsx::replaceAudioTrackWithProcessed`
  - code: `src/features/space/hooks/useAudioGateProcessor.ts::useAudioGateProcessor`

### Contract: LIVEKIT_HOOK_AUDIO

- **Tier**: normal
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

- **Tier**: normal
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

- **Tier**: normal
- **What**: useVolumeMeter Web Audio API 실시간 볼륨 측정
- **Rules**:
  | 레벨 | 범위 | 표시 |
  |------|------|------|
  | 조용함 | 0-20 | 녹색 1칸 |
  | 보통 | 20-50 | 녹색 2-3칸 |
  | 큼 | 50-80 | 노란색 4-5칸 |
  | 너무 큼 | 80-100 | 빨간색 |
- **Evidence**:
  - code: `src/features/space/hooks/useVolumeMeter.ts`

### Contract: LIVEKIT_HOOK_DEVICES

- **Tier**: core
- **What**: useMediaDevices 미디어 장치 관리
- **Rules**:
  | 규칙 | 설명 |
  |------|------|
  | Option C | 지연된 권한 요청 (iOS Safari 호환) |
  | 마운트 시 | getUserMedia 호출 안함 |
  | 설정 열 때 | requestPermission() 호출 |
  | 장치 변경 | devicechange 이벤트 리스닝 |
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

## 변경 이력

| 날짜 | 요약 | 커밋 |
|------|------|------|
| 2026-01-22 | A등급 보강: 요약 섹션, Tier/Rules 추가, AudioGate Contract 신규 | - |
| 2026-01-22 | 입력 감도 조절 시 음성 출력 차단 버그 수정 - sensitivity 0↔non-zero 전환 시 트랙 복원 로직 추가 | 14be122 |
| 2026-01-21 | 초기 작성 (DocOps Phase 2) | - |
