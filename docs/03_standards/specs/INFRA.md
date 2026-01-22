# INFRA - 인프라 아키텍처

> Oracle Cloud + Vercel 기반 인프라 구성 및 배포 가이드

---

## 개요

LiveKit + Socket.io를 Oracle Always Free에 통합 배포하여 인프라 비용 $0 달성

---

## 운영 환경

| 서비스 | URL | 인프라 |
|--------|-----|--------|
| Next.js | https://space.flow-coder.com | Vercel |
| Socket.io | https://space-socket.flow-coder.com | Oracle Cloud |
| LiveKit | wss://space-livekit.flow-coder.com | Oracle Cloud |

---

<!-- FUNCTIONAL:BEGIN -->

### Contract: INFRA_FUNC_VERCEL_DEPLOY

- **What**: Vercel 프로덕션 배포 (Next.js 앱)
- **Evidence**:
  - code: `vercel.json`
  - code: `.env.production`

### Contract: INFRA_FUNC_OCI_SERVER

- **What**: Oracle Cloud 통합 서버 (Socket.io + LiveKit)
- **Evidence**:
  - code: `terraform/flowspace-stack/main.tf`
  - code: `terraform/flowspace-stack/cloud-init.yaml`

### Contract: INFRA_FUNC_SOCKET_SERVER

- **What**: Socket.io 실시간 서버 배포
- **Evidence**:
  - code: `server/index.ts::io`
  - code: `server/package.json`

### Contract: INFRA_FUNC_LIVEKIT_SELFHOST

- **What**: LiveKit 자체 호스팅 설정
- **Evidence**:
  - code: `terraform/flowspace-stack/cloud-init.yaml`
  - code: `.env.production`

### Contract: INFRA_FUNC_SSL_CADDY

- **What**: Caddy 리버스 프록시 및 SSL 자동화
- **Evidence**:
  - code: `terraform/flowspace-stack/caddy/Caddyfile`

### Contract: INFRA_FUNC_OCI_MONITORING

- **What**: OCI 리소스 모니터링 API
- **Rules**:
  | 메트릭 | 데이터 소스 | 용도 |
  |--------|------------|------|
  | CPU | OCI Monitoring API | 실시간 사용률 |
  | 메모리 | OCI Monitoring API | 실시간 사용률 |
  | 트래픽 | OCI Monitoring API | 월 누적 + 예측 |
  | 스토리지 할당량 | Block Volume API | Boot Volume 크기 |
  | 스토리지 사용량 | Socket 서버 df | 실제 사용량 |
- **Evidence**:
  - code: `src/app/api/admin/oci-metrics/route.ts::GET`
  - code: `src/lib/utils/oci-monitoring.ts::getOCIInstanceMetrics`

### Contract: INFRA_FUNC_OCI_COST

- **What**: OCI 비용 추정 및 무료 한도 관리
- **Rules**:
  - Always Free 한도: 4 OCPU, 24GB RAM, 200GB Storage, 10TB/월 트래픽
  - 1공간 50명×9시간 = 무료 범위
  - 트래픽 초과 시 과금 발생
- **Evidence**:
  - code: `src/lib/utils/oci-cost.ts::calculateCostEstimate`

### Contract: INFRA_FUNC_METRICS_CRON

- **What**: 메트릭 수집 크론 작업
- **Evidence**:
  - code: `src/app/api/cron/collect-metrics/route.ts::POST`

<!-- FUNCTIONAL:END -->

---

## 인프라 구조

```
┌─────────────────────────────────────────────────────────────────┐
│                    목표 구조 (비용 $0)                           │
├─────────────────────────────────────────────────────────────────┤
│   ┌──────────┐      ┌─────────────────────────────────────┐    │
│   │  Vercel  │      │      Oracle Always Free              │    │
│   │ Next.js  │─────▶│   ┌──────────┐   ┌──────────┐       │    │
│   │   FREE   │      │   │Socket.io │   │ LiveKit  │       │    │
│   └──────────┘      │   │  :3001   │   │  :7880   │       │    │
│                     │   └──────────┘   └──────────┘       │    │
│                     │       4 OCPU / 24GB RAM / $0         │    │
│                     └─────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Oracle Cloud 리소스

| 리소스 | 한도 | 사용량 | 여유 |
|--------|------|--------|------|
| CPU | 4 OCPU | ~2.5 OCPU | ✅ |
| 메모리 | 24GB | ~6GB | ✅ |
| 스토리지 | 200GB | ~50GB | ✅ |
| 트래픽 | 10TB/월 | 가변 | ⚠️ 모니터링 |

---

## 참조

- 원본: `docs/infrastructure/OCI.md`

---

## 변경 이력

| 날짜 | 요약 | 커밋 |
|------|------|------|
| 2026-01-22 | 트래픽 퍼센트 소수점 표시 수정 (0% → 0.2%) | `e5a43dc` |
| 2026-01-22 | 트래픽 델타 시간 기반 정규화 추가 | `b506af6` |
| 2026-01-22 | OCI_INTERNAL_IP 환경 변수 필수화 (보안 강화) | `5c365fe` |
| 2026-01-21 | DocOps 자동 변환 | - |
