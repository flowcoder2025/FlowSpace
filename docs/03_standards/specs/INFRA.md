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
  - code: `server/socket-server.ts::io`
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

> **마이그레이션**: 2026-01-21 DocOps 자동 변환
