# 녹화 기능 법적 준수 태스크

> **생성일**: 2025-12-16
> **상태**: 진행 중
> **우선순위**: 높음 (법적 리스크)

---

## 1. 현재 구현 분석 결과

### 1.1 구현된 파일
- `src/features/space/hooks/useScreenRecorder.ts` - 녹화 훅
- `src/features/space/components/video/ScreenShare.tsx` - 녹화 UI
- `src/features/space/components/video/ParticipantPanel.tsx` - 참가자 패널
- `src/features/space/components/video/VideoTile.tsx` - 비디오 타일

### 1.2 현재 기능
- MediaRecorder API 기반 녹화
- 녹화 시작/중지/일시정지
- 녹화 시간 표시
- 로컬 REC 인디케이터 (녹화자만 보임)
- 권한 체크 (STAFF/OWNER/SuperAdmin)

### 1.3 법적 미비사항
| 항목 | 상태 | 설명 |
|-----|------|------|
| 참가자 동의 모달 | ❌ 없음 | 녹화 시작 전 동의 수집 필요 |
| 타 참가자 알림 | ❌ 없음 | Socket.io로 브로드캐스트 필요 |
| 공용 REC 표시 | ❌ 없음 | 모든 참가자에게 표시 필요 |
| 동의 로그 | ❌ 없음 | DB에 동의 기록 저장 필요 |
| 개인정보처리방침 | ⚠️ 확인필요 | 녹화 관련 고지 추가 필요 |

---

## 2. 법적 요구사항 (한국)

### 2.1 개인정보보호법
- 수집 전 동의 필수
- 수집 목적 명시
- 보관 기간 안내
- 파기 절차 안내

### 2.2 통신비밀보호법
- 녹음/녹화 사실 고지 의무
- 참가자 인지 상태 필요

### 2.3 정보통신망법
- 개인정보처리방침 게시
- 동의 철회 방법 안내

---

## 3. 구현 계획 (확정)

### Phase 1: 포괄 동의 시스템 (온보딩)
- [x] Prisma 스키마 확장 (agreedToRecording, agreedToRecordingAt)
- [ ] 온보딩 페이지 생성 (/onboarding)
- [ ] 동의 API 생성 (/api/user/consent)
- [ ] NextAuth 콜백 수정 (신규 유저 리다이렉트)

### Phase 2: Socket.io 녹화 이벤트
- [ ] recording:start 이벤트 정의
- [ ] recording:stop 이벤트 정의
- [ ] 서버 핸들러 구현
- [ ] 클라이언트 수신 처리

### Phase 3: 전역 REC 표시
- [ ] RecordingIndicator 컴포넌트 생성
- [ ] SpaceLayout에 통합
- [ ] useScreenRecorder 훅에 Socket emit 추가

---

## 4. 체크포인트

| Phase | 상태 | 완료일 |
|-------|------|--------|
| Phase 1 | 🔄 진행중 | - |
| Phase 2 | ⏳ 대기 | - |
| Phase 3 | ⏳ 대기 | - |

