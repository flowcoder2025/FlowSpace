# SUBTASK: OCI Admin 대시보드 모니터링 고도화

> **상위 문서**: `/CLAUDE.md`, `/docs/infrastructure/OCI.md`
> **생성일**: 2026-01-09
> **목표**: 오늘 내 모든 작업 완료

---

## 작업 배경

GPT 분석 기반 2트랙 모니터링 아키텍처:
- **트랙 1**: 운영 지표 (Monitoring API) - 실시간 대시보드용
- **트랙 2**: 비용 지표 (Usage API) - 청구 기준 (P2, 향후)

---

## Phase 1: 스토리지 연동 완료 ✅ (구현됨, 배포 필요)

### 1.1 Socket 서버 스토리지 메트릭 ✅
- [x] `execSync` import 추가
- [x] `getStorageMetrics()` 함수 구현 (df 명령어 기반)
- [x] `/metrics` 응답에 storage 필드 추가
- [x] 버전 2.0.0으로 업데이트

### 1.2 OCI 메트릭 API 연동 ✅
- [x] `SocketServerMetrics` 타입에 storage 추가
- [x] 응답에서 socketMetrics.storage 사용

### 1.3 배포 ✅
- [x] Socket 서버 빌드 (esbuild)
- [x] OCI 서버에 업로드
- [x] Docker 컨테이너 재시작
- [x] /metrics 엔드포인트 확인 (storage: 44.96GB 중 4.61GB = 10%)

---

## Phase 2: Block Volume API 할당량 연동 ✅

### 2.1 OCI Block Volume API 클라이언트 ✅
- [x] `oci.core.ComputeClient` Boot Volume Attachment 조회
- [x] `oci.core.BlockstorageClient` Boot Volume 상세 조회
- [x] `getBootVolumeInfo()` 함수 구현

### 2.2 API 통합 ✅
- [x] oci-metrics route에 Boot Volume 데이터 추가
- [x] 스토리지 응답 구조 개선:
  - `allocatedGB`: Boot Volume API (할당량)
  - `usedGB`: Socket 서버 df (실사용량)
  - `sources.allocation`: "block-volume-api"
  - `sources.usage`: "socket-server-df"

---

## Phase 3: UI 측정 기준 라벨 표시 ✅

### 3.1 데이터 소스 라벨 ✅
- [x] ResourceCard 컴포넌트에 소스 라벨 개선
  - CPU/메모리: "OCI Monitoring API"
  - 트래픽: "OCI Monitoring API"
  - 스토리지 사용량: "서버 df"
  - 스토리지 할당량: "Block Volume API"
- [x] 스토리지 카드에 할당량/사용량 분리 표시

### 3.2 비용 카드 명확화 ✅
- [x] "추정치" Badge 추가
- [x] "한도 기반 계산 (Monitoring API)" 소스 라벨 추가

---

## Phase 4: 문서 업데이트

### 4.1 OCI.md 업데이트
- [ ] 모니터링 아키텍처 섹션 추가
- [ ] 2트랙 구조 문서화
- [ ] API 소스별 역할 정리

### 4.2 server/CLAUDE.md 업데이트
- [ ] /metrics 엔드포인트 v2.0.0 변경사항
- [ ] storage 필드 문서화

---

## 진행 상태

| Phase | 상태 | 완료일 |
|-------|------|--------|
| Phase 1 | ✅ 완료 | 2026-01-09 |
| Phase 2 | ✅ 완료 | 2026-01-09 |
| Phase 3 | ✅ 완료 | 2026-01-09 |
| Phase 4 | 🔄 진행중 | - |

---

## 마무리 체크리스트 (CLAUDE.md 0.7.4 준수)

- [ ] 타입체크: `npx tsc --noEmit`
- [ ] 빌드테스트: `npm run build`
- [ ] 문서 업데이트: OCI.md, server/CLAUDE.md
- [ ] Git 커밋 & 푸시
- [ ] 완료 보고 & 피드백 요청
