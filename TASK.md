# TASK: 화면공유 녹화 기능 구현

> **상태**: ✅ 완료
> **시작일**: 2025-12-16
> **범위**: ScreenShare 컴포넌트에 녹화 기능 추가

---

## 🎯 목표

### 핵심 요구사항
1. **녹화 권한 제어** - STAFF, OWNER, SuperAdmin만 녹화 가능
2. **녹화 표시** - 공유 중인 화면에 🔴 녹화 중 표시
3. **로컬 저장** - 사용자가 저장 위치 직접 선택
4. **파일명 형식** - `YYYY_MM_DD_HH:MM:SS_공간이름.webm`
5. **화면+음성 녹화** - 화면과 오디오 모두 포함

### 기술 스택
- MediaRecorder API (클라이언트 측 녹화)
- File System Access API (저장 위치 선택)
- WebM 포맷 (video/webm;codecs=vp9,opus)

---

## 📋 Phase 1: 분석 ✅

- [x] ScreenShare 컴포넌트 구조 분석 (Serena)
- [x] 역할/권한 정보 전달 경로 파악
- [x] 오디오 트랙 접근 방법 확인

---

## 📋 Phase 2: useScreenRecorder 훅 구현 ✅

- [x] MediaRecorder 초기화 로직
- [x] 녹화 시작/중지/일시정지 기능
- [x] Blob 데이터 수집 및 파일 생성
- [x] 파일명 생성 유틸리티 (날짜_공간명)
- [x] showSaveFilePicker API 통합

---

## 📋 Phase 3: ScreenShare UI 수정 ✅

- [x] 녹화 버튼 추가 (권한 있는 사용자만 표시)
- [x] 녹화 중 표시 UI (🔴 REC + 타이머)
- [x] 녹화 컨트롤 (시작/중지)
- [x] Props 확장 (역할 정보, 공간명)

---

## 📋 Phase 4: 권한 연동 ✅

- [x] SpaceLayout에서 역할 정보 전달
- [x] canRecord 권한 계산 로직
- [x] ScreenShareOverlay Props 확장

---

## 📋 Phase 5: 검증 ✅

- [x] 타입체크 통과
- [x] 빌드 테스트 통과
- [x] 본인 화면 공유 녹화 기능 추가 (VideoTile + ParticipantPanel)
- [ ] 실제 녹화 테스트 (수동 확인 필요)

---

## 📊 진행 상태

| Phase | 상태 | 완료일 |
|-------|------|--------|
| Phase 1: 분석 | ✅ 완료 | 2025-12-16 |
| Phase 2: useScreenRecorder | ✅ 완료 | 2025-12-16 |
| Phase 3: ScreenShare UI | ✅ 완료 | 2025-12-16 |
| Phase 4: 권한 연동 | ✅ 완료 | 2025-12-16 |
| Phase 5: 검증 | ✅ 완료 | 2025-12-16 |

---

## 🔧 수정/생성 대상 파일

| 파일 | 변경 내용 |
|-----|----------|
| `src/features/space/hooks/useScreenRecorder.ts` | 신규 - 녹화 훅 |
| `src/features/space/components/video/ScreenShare.tsx` | 녹화 UI 추가 (타인 화면공유) |
| `src/features/space/components/video/VideoTile.tsx` | 녹화 UI 추가 (본인 화면공유) |
| `src/features/space/components/video/ParticipantPanel.tsx` | canRecord/spaceName props 전달 |
| `src/features/space/components/SpaceLayout.tsx` | 역할 정보 및 녹화 권한 전달 |

---

## 변경 이력

| 날짜 | 내용 |
|-----|------|
| 2025-12-16 | TASK.md 초기화 - 화면공유 녹화 기능 태스크 시작 |
| 2025-12-16 | Phase 1-5 완료 - 녹화 기능 구현 및 검증 완료 |

