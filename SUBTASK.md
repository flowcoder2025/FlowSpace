# SUBTASK: 인프라 설정 및 기능 구현

> **상위 문서**: `/CLAUDE.md`, `/docs/ROADMAP.md`
> **생성일**: 2026-01-10
> **목표**: OCI 인프라 완성 + Admin 대시보드 + 공간 기반 커뮤니케이션

---

## 작업 개요

| 순서 | 작업 | 예상 시간 | 상태 |
|:---:|------|:--------:|:----:|
| 1 | OCI LiveKit Webhook 설정 | ~5분 | ✅ 완료 |
| 2 | Admin 대시보드 - 사용량 분석 탭 | ~2시간 | ✅ 완료 |
| 3 | 공간 기반 커뮤니케이션 | ~1일 | ✅ 완료 |

---

## Task 1: OCI LiveKit Webhook 설정

> **목표**: 사용량 측정 시스템이 VIDEO_START/END 이벤트를 수신하도록 설정

### 1.1 LiveKit 설정 파일 수정
- [x] OCI 서버 SSH 접속
- [x] `/home/ubuntu/flowspace/livekit/livekit.yaml` 수정
- [x] webhook URL 추가: `https://flow-metaverse.vercel.app/api/livekit/webhook`

### 1.2 LiveKit 컨테이너 재시작
- [x] Docker 컨테이너 재시작
- [x] 로그 확인

### 1.3 검증
- [x] LiveKit 서버 정상 시작 확인 (v1.9.10)

---

## Task 2: Admin 대시보드 - 사용량 분석 탭

> **목표**: 수집된 사용량 데이터를 시각화하는 Admin UI

### 2.1 페이지 생성
- [x] `UsageAnalysis.tsx` 컴포넌트 생성
- [x] Admin 페이지에 "사용량 분석" 탭 추가

### 2.2 데이터 페칭
- [x] `/api/admin/usage/analysis` 연동
- [x] useState/useEffect로 데이터 로딩

### 2.3 시계열 그래프
- [x] recharts 설치
- [x] 트래픽 AreaChart (GB 단위)
- [x] 사용자/CPU LineChart (복합 Y축)
- [x] 기간 선택 (시간별/일별/주별, 7/14/30/90일)

### 2.4 상관관계 분석 표시
- [x] GB/영상-분, GB/영상-시간 카드
- [x] GB/사용자-시간 카드
- [x] CPU%/사용자 카드
- [x] 신뢰도 Badge (low/medium/high)

### 2.5 비용 예측 계산기
- [x] 동시접속자/일일시간/운영일수 입력
- [x] 예상 트래픽 (GB/TB) 계산
- [x] 예상 비용 (USD/KRW) 계산
- [x] OCI 10TB 무료 한도 반영

---

## Task 3: 공간 기반 커뮤니케이션

> **목표**: 근접 통신, 파티 존, 스포트라이트 시스템 구현
> **설계 문서**: `/docs/roadmap/SPATIAL-COMMUNICATION.md`

### 3.1 근접 통신 (Proximity Chat) - ✅ Phase 1 완료
- [x] `useProximitySubscription` 훅 생성
  - 7×7 타일 범위 감지 로직
  - 거리 기반 볼륨 계산
  - LiveKit 트랙 구독 제어 (RemoteTrackPublication.setSubscribed)
  - 스포트라이트/파티 존 우선순위 처리 구조
- [x] SpaceLayout에 훅 통합
  - 로컬 플레이어 위치 추적 (eventBridge PLAYER_MOVED)
  - 원격 플레이어 위치 변환 (Socket.io players → Position Map)
- [x] `ProximityIndicator` UI 컴포넌트
  - 전역/근접 모드 표시
  - 범위 내/외 사용자 수 표시
  - 상세 드롭다운 (사용자 목록)
- [ ] 근접 기능 활성화 옵션 추가 (공간 설정 - 향후)

### 3.2 파티 존 (Zone-based Groups) - ✅ Phase 2 완료
- [x] Prisma 스키마: PartyZone 모델 추가
- [x] API 라우트: `/api/spaces/[id]/zones` CRUD (GET/POST), `/api/spaces/[id]/zones/[zoneId]` (GET/PUT/DELETE)
- [x] `usePartyZone` 훅 구현
  - 공간 내 파티 존 목록 페칭
  - 그리드 좌표 기반 존 입장/퇴장 감지 (픽셀→타일 변환)
  - 디바운스 처리 (경계선 왔다갔다 방지)
  - 같은 존 내 사용자 Set 계산 (partyZoneUsers)
  - Socket.io joinParty/leaveParty 자동 호출
- [x] SpaceLayout 통합
  - usePartyZone 훅 연결
  - partyZoneUsers → useProximitySubscription 연동
- [x] 채팅 UI 통합
  - FloatingChatOverlay: currentZone, onSendPartyMessage props 추가
  - ChatTabs: 파티 존 내 존 이름 표시 + 🏠 아이콘
  - ChatInputArea: 파티 탭에서 파티 메시지 전송 지원
- [ ] 존 내 음성 그룹화 (Phase 2.5 - 향후)

### 3.3 스포트라이트 시스템 - ✅ Phase 3 완료
- [x] DB 스키마: SpotlightGrant 모델 (Prisma)
- [x] API 라우트: grant/revoke/activate 엔드포인트
- [x] Socket.io 서버: spotlight:activate/deactivate 이벤트
- [x] 클라이언트 훅: useSocket 스포트라이트 상태/명령 추가
- [x] SpaceLayout: spotlightUsers 연동 + useProximitySubscription 통합
- [x] UI 컴포넌트: ControlBar 스포트라이트 버튼 + VideoTile 스포트라이트 인디케이터
- [x] 스포트라이트 활성화 시 전체 공간에 음성/영상 브로드캐스트

---

## 진행 상태

| Task | 상태 | 시작 | 완료 |
|------|:----:|------|------|
| Task 1 | ✅ 완료 | 2026-01-10 | 2026-01-10 |
| Task 2 | ✅ 완료 | 2026-01-10 | 2026-01-10 |
| Task 3 | ✅ 완료 | 2026-01-10 | 2026-01-10 |

---

## 변경 이력

| 날짜 | 변경 |
|-----|------|
| 2026-01-10 | 초기 생성 - 3개 Task 계획 수립 |
| 2026-01-10 | Task 3 Phase 1 완료 - 근접 통신 기본 구조 구현 |
| 2026-01-10 | Task 3 Phase 2 완료 - 파티 존 시스템 구현 (DB/API/훅/UI) |
| 2026-01-10 | **SUBTASK 전체 완료** - Task 1~3 모두 완료, 빌드 검증 통과 |
