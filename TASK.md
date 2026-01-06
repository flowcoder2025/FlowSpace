# TASK: 음성 및 비디오 고급 설정 시스템

> **목표**: 디스코드 스타일의 종합 미디어 설정 패널 구현
> **시작일**: 2026-01-06
> **이전 태스크**: 볼륨 조절 기능 개선 ✅ 완료
> **예상 파일 수**: 12개 (신규 8개, 수정 4개)

---

## 📋 요구사항 요약

1. **마이크 문제 해결**: Option C (지연된 권한 요청) 적용
2. **음성 고급 설정**: 잡음 제거, 에코 제거, 자동 게인, 입력 감도, 마이크 테스트
3. **비디오 고급 설정**: 해상도, 프레임레이트, 미러 모드, 카메라 미리보기
4. **UI 진입점**: 드롭다운 메뉴에 "음성 및 비디오 설정" 추가
5. **설정 영속성**: localStorage 저장

---

## 🏗️ 아키텍처

```
/src/features/space
├── /components
│   └── /settings                      # 📌 신규 폴더
│       ├── MediaSettingsModal.tsx     # 메인 설정 모달
│       ├── AudioSettings.tsx          # 음성 설정 탭
│       ├── VideoSettings.tsx          # 비디오 설정 탭
│       ├── DeviceSelector.tsx         # 장치 선택 컴포넌트
│       ├── VolumeMeter.tsx            # 실시간 볼륨 미터
│       ├── MicrophoneTest.tsx         # 마이크 테스트 (녹음/재생)
│       ├── CameraPreview.tsx          # 카메라 미리보기
│       └── index.ts
│
├── /hooks
│   ├── useMediaDevices.ts             # 🔧 수정: Option C 적용
│   ├── useAudioSettings.ts            # 📌 신규: 오디오 설정 관리
│   ├── useVideoSettings.ts            # 📌 신규: 비디오 설정 관리
│   └── useVolumeMeter.ts              # 📌 신규: 볼륨 레벨 측정
│
├── /livekit
│   └── LiveKitRoomProvider.tsx        # 🔧 수정: 동적 옵션 적용
│
├── /types
│   └── media-settings.types.ts        # 📌 신규: 설정 타입 정의
│
└── /components/controls
    └── ControlBar.tsx                 # 🔧 수정: 설정 메뉴 추가
```

---

## 🎛️ 기능 상세

### 음성 설정 (AudioSettings)

| 기능 | 설명 | LiveKit 옵션 |
|-----|------|-------------|
| 입력 장치 선택 | 마이크 드롭다운 | deviceId |
| 출력 장치 선택 | 스피커 드롭다운 | audioOutput |
| 입력 볼륨 | 0-100% 슬라이더 | - |
| 출력 볼륨 | 0-100% 슬라이더 | - |
| 잡음 제거 | On/Off 토글 | noiseSuppression |
| 에코 제거 | On/Off 토글 | echoCancellation |
| 자동 게인 | On/Off 토글 | autoGainControl |
| 고급 음성 분리 | On/Off 토글 (실험적) | voiceIsolation |
| 입력 감도 | 임계값 슬라이더 | VAD threshold |
| 실시간 볼륨 미터 | 입력 레벨 시각화 | Web Audio API |
| 마이크 테스트 | 녹음 → 재생 | MediaRecorder |

### 비디오 설정 (VideoSettings)

| 기능 | 설명 | LiveKit 옵션 |
|-----|------|-------------|
| 카메라 선택 | 카메라 드롭다운 | deviceId |
| 해상도 프리셋 | 480p/720p/1080p | resolution |
| 프레임레이트 | 15/24/30/60 fps | frameRate |
| 카메라 방향 | 전면/후면 (모바일) | facingMode |
| 미러 모드 | 좌우 반전 | CSS transform |
| 카메라 미리보기 | 실시간 프리뷰 | getUserMedia |

---

## Phase 1: 기반 구축 (타입 + 훅)

### 1.1 타입 정의
- [x] `media-settings.types.ts` 생성
  - AudioSettings 인터페이스
  - VideoSettings 인터페이스
  - VideoResolutionPreset 타입
  - 기본값 상수

### 1.2 useMediaDevices 수정 (Option C)
- [x] 마운트 시 getUserMedia 호출 제거
- [x] `requestPermission()` 함수 추가
- [x] `hasPermission` 상태 추가
- [x] 권한 획득 후 장치 목록 갱신

### 1.3 useAudioSettings 훅 생성
- [x] localStorage 로드/저장
- [x] 음성 처리 옵션 관리
  - noiseSuppression
  - echoCancellation
  - autoGainControl
  - voiceIsolation (실험적)
- [x] 입력 감도 관리
- [x] 볼륨 관리

### 1.4 useVideoSettings 훅 생성
- [x] localStorage 로드/저장
- [x] 비디오 옵션 관리
  - resolution (480p/720p/1080p)
  - frameRate (15/24/30/60)
  - facingMode (user/environment)
  - mirrorMode (셀카 미러링)

### 1.5 useVolumeMeter 훅 생성
- [x] Web Audio API 기반 볼륨 측정
- [x] AnalyserNode로 실시간 레벨 분석
- [x] requestAnimationFrame 최적화
- [x] 클린업 처리

---

## Phase 2: UI 컴포넌트

### 2.1 DeviceSelector 컴포넌트
- [x] 드롭다운 UI
- [x] 장치 label 표시 (권한 있을 때)
- [x] 장치 없음 상태 표시
- [x] 장치 변경 시 콜백

### 2.2 VolumeMeter 컴포넌트
- [x] 실시간 볼륨 바 시각화
- [x] 입력 감도 표시 라인
- [x] 세그먼트 스타일 (디스코드처럼)
- [x] 반응형 애니메이션

### 2.3 MicrophoneTest 컴포넌트
- [x] "테스트 시작" 버튼
- [x] MediaRecorder로 5초 녹음
- [x] 녹음 진행 표시 (카운트다운)
- [x] "재생" 버튼으로 확인
- [x] 상태 머신: idle → recording → recorded → playing
- [x] 재녹음 버튼

### 2.4 CameraPreview 컴포넌트
- [x] 실시간 비디오 프리뷰
- [x] 미러 모드 반영
- [x] 해상도/프레임레이트 오버레이 표시
- [x] 로딩/에러 상태

### 2.5 AudioSettings 탭 컴포넌트
- [x] 입력 장치 선택
- [x] 출력 장치 선택
- [x] 볼륨 미터
- [x] 음성 처리 토글들
- [x] 입력 감도 슬라이더
- [x] 마이크 테스트 영역
- [x] 섹션 구분 (입력/출력/처리)

### 2.6 VideoSettings 탭 컴포넌트
- [x] 카메라 선택
- [x] 해상도 프리셋 라디오/드롭다운
- [x] 프레임레이트 선택
- [x] 미러 모드 토글
- [x] 카메라 미리보기 영역
- [x] 모바일: 전면/후면 전환 버튼

### 2.7 MediaSettingsModal 메인 컴포넌트
- [x] 탭 네비게이션 (음성/비디오)
- [x] 설정 모달 레이아웃
- [x] 저장/취소/기본값 복원 버튼
- [x] ESC로 닫기
- [x] 포커스 트랩
- [x] 반응형 크기

---

## Phase 3: 통합

### 3.1 ControlBar 수정
- [x] 마이크 드롭다운에 구분선 + "음성 및 비디오 설정" 메뉴 추가
- [x] 카메라 드롭다운에도 동일 메뉴 추가
- [x] 설정 메뉴 클릭 시 모달 열기 (기본 탭 지정)
- [x] 아이콘 추가 (설정 기어)

### 3.2 LiveKitRoomProvider 수정
- [x] useAudioSettings에서 옵션 가져오기
- [x] useVideoSettings에서 옵션 가져오기
- [x] audioCaptureDefaults 동적 구성
- [x] videoCaptureDefaults 동적 구성
- [ ] 설정 변경 시 트랙 재시작 로직 (⏸️ 향후 구현 - 실시간 변경 시 필요)

### 3.3 설정 적용 흐름
- [x] 모달에서 설정 변경
- [x] 저장 시 localStorage 업데이트
- [x] LiveKit 트랙에 새 옵션 적용 (roomOptions.audioCaptureDefaults/videoCaptureDefaults)
- [x] 실시간 미리보기 반영

---

## Phase 4: 테스트 및 마무리

### 4.1 기능 테스트
- [x] 타입체크 통과 (`npx tsc --noEmit`)
- [x] 빌드 성공 (`npm run build`)
- [ ] 마이크 권한 요청 타이밍 확인 (Option C) - 사용자 테스트 필요
- [ ] 음성 처리 옵션 동작 확인 - 사용자 테스트 필요
- [ ] 비디오 해상도 변경 확인 - 사용자 테스트 필요
- [ ] 프레임레이트 변경 확인 - 사용자 테스트 필요
- [ ] 마이크 테스트 녹음/재생 확인 - 사용자 테스트 필요
- [ ] 설정 저장/복원 확인 - 사용자 테스트 필요
- [ ] 미러 모드 동작 확인 - 사용자 테스트 필요

### 4.2 크로스 브라우저 테스트
- [ ] Chrome (데스크톱) - 사용자 테스트 필요
- [ ] Safari (macOS) - 사용자 테스트 필요
- [ ] Safari (iOS/iPad) - 마이크 문제 해결 확인 - 사용자 테스트 필요
- [ ] Edge - 사용자 테스트 필요
- [ ] 모바일 Chrome (Android) - 사용자 테스트 필요

### 4.3 문서화
- [x] space/claude.md 업데이트
- [x] 훅 사용법 주석 (JSDoc 주석 포함)
- [x] TASK.md 완료 처리

---

## 📊 진행 상태

| Phase | 상태 | 진행률 | 비고 |
|-------|------|--------|------|
| Phase 1: 기반 구축 | ✅ 완료 | 100% | 타입, 훅 모두 완료 |
| Phase 2: UI 컴포넌트 | ✅ 완료 | 100% | 7개 컴포넌트 구현 |
| Phase 3: 통합 | ✅ 완료 | 95% | ControlBar ✅, LiveKit 옵션 적용 ✅, 트랙 재시작 ⏸️ |
| Phase 4: 테스트 | 🔶 부분 완료 | 40% | 빌드 ✅, 문서 ✅, 사용자 테스트 필요 |

---

## 📚 참조 문서

- [LiveKit AudioCaptureOptions](https://docs.livekit.io/client-sdk-js/interfaces/AudioCaptureOptions.html)
- [LiveKit VideoCaptureOptions](https://docs.livekit.io/reference/client-sdk-js/interfaces/VideoCaptureOptions.html)
- [LiveKit Noise Cancellation](https://docs.livekit.io/home/client/tracks/noise-cancellation/)
- [Configuring Video Quality](https://kb.livekit.io/articles/3859313029-configuring-the-client-sdk-for-optimal-video-quality)
- [VideoPresets Reference](https://docs.livekit.io/client-sdk-js/variables/VideoPresets.html)

---

## 변경 이력

| 날짜 | 버전 | 변경 |
|-----|------|------|
| 2025-12-31 | - | (이전) 볼륨 조절 기능 개선 태스크 완료 |
| 2026-01-06 | 1.0.0 | 음성 및 비디오 고급 설정 태스크 생성 |
| 2026-01-06 | 2.0.0 | Phase 1~2 완료, Phase 3 부분 구현, 체크리스트 업데이트 |
| 2026-01-06 | 3.0.0 | Phase 3 완료: LiveKitRoomProvider에 오디오/비디오 설정 적용 |
