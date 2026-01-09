# SUBTASK: 사용량 측정 시스템 구현

> **상위 문서**: `/CLAUDE.md`, `/docs/infrastructure/OCI.md`
> **생성일**: 2026-01-09
> **목표**: 시범 운영용 리소스-사용량 상관관계 측정 시스템

---

## 작업 배경

부트캠프 시범 운영을 위한 실측 기반 비용 예측 시스템:
- **목표**: "영상 N명 × M시간 = 트래픽 X GB" 공식 도출
- **방식**: 이벤트 로깅 + 리소스 스냅샷 + 상관관계 분석
- **데이터 보존**: Raw(7일) → 시간별(90일) → 일별(영구)

---

## Phase 1: 스키마 확장 ✅

### 1.1 EventType 확장
- [x] VIDEO_START, VIDEO_END 추가
- [x] SCREEN_SHARE_START, SCREEN_SHARE_END 추가

### 1.2 SpaceEventLog 확장
- [x] participantId 필드 추가 (LiveKit 연동용)
- [x] metadata Json 필드 활용 확인 (기존 존재)

### 1.3 ResourceSnapshot 모델
- [x] 신규 모델 생성
- [x] cpuPercent, memoryPercent, memoryMB, trafficGB, trafficDeltaMB, concurrentUsers, activeRooms

### 1.4 집계 모델
- [x] UsageHourly (시간별 집계) - 90일 보존
- [x] UsageDaily (일별 집계) - 영구 보존

### 1.5 데이터베이스 적용
- [x] prisma db push 실행 완료

---

## Phase 2: LiveKit Webhook 연동 ✅

### 2.1 Webhook 엔드포인트
- [x] /api/livekit/webhook 생성
- [x] Webhook 시그니처 검증 (WebhookReceiver)

### 2.2 이벤트 처리
- [x] track_published → VIDEO_START / SCREEN_SHARE_START
- [x] track_unpublished → VIDEO_END / SCREEN_SHARE_END

### 2.3 LiveKit 서버 설정
- [x] livekit.yaml에 webhook_url 추가 (로컬)
- [ ] OCI 서버 재배포 (수동 - 아래 Production 설정 참고)

**Production 설정 필요 (OCI livekit.yaml)**:
```yaml
webhook:
  urls:
    - https://[VERCEL_DOMAIN]/api/livekit/webhook
  api_key: [LIVEKIT_API_KEY]
```

---

## Phase 3: 리소스 스냅샷 수집 ✅

### 3.1 Cron 엔드포인트
- [x] /api/cron/collect-metrics 생성
- [x] OCI 메트릭 조회 → ResourceSnapshot 저장

### 3.2 Vercel Cron 설정
- [x] vercel.json cron 설정 (*/5 * * * * - 5분마다)

### 3.3 트래픽 델타 계산
- [x] 이전 스냅샷과 비교하여 증가량 계산 (월초 리셋 처리 포함)

---

## Phase 4: 집계 시스템 ✅

### 4.1 시간별 집계
- [x] Raw 데이터 → UsageHourly 집계 로직
- [x] 매시간 실행 cron (5 * * * * - 매시 5분)

### 4.2 일별 집계
- [x] UsageHourly → UsageDaily 집계 로직
- [x] UTC 0시 실행 (같은 cron에서 조건부)

### 4.3 데이터 정리
- [x] 7일 지난 ResourceSnapshot 삭제
- [x] 90일 지난 UsageHourly 삭제
- [x] UTC 1시 실행 (같은 cron에서 조건부)

---

## Phase 5: 분석 API & 대시보드 ✅

### 5.1 분석 API
- [x] /api/admin/usage/analysis 엔드포인트
- [x] 시간대별 이벤트 ↔ 리소스 매칭 (hourly/daily/weekly)
- [x] 상관관계 계산 (GB/영상-분, GB/사용자-시간, CPU/사용자)
- [x] 비용 예측 공식 자동 도출

### 5.2 Admin 대시보드 UI
- [ ] 사용량 분석 탭 추가 (향후 구현)
- [ ] 시계열 그래프 (향후 구현)
- [ ] 상관관계 분석 결과 표시 (향후 구현)
- [ ] 비용 예측 계산기 (향후 구현)

> **참고**: 대시보드 UI는 데이터 수집 이후 구현 예정. API를 통해 JSON으로 분석 결과 확인 가능.

---

## 진행 상태

| Phase | 상태 | 완료일 |
|-------|------|--------|
| Phase 1 | ✅ 완료 | 2026-01-09 |
| Phase 2 | ✅ 완료 | 2026-01-09 |
| Phase 3 | ✅ 완료 | 2026-01-09 |
| Phase 4 | ✅ 완료 | 2026-01-09 |
| Phase 5 | ✅ 완료 | 2026-01-09 |

---

## 마무리 체크리스트 (CLAUDE.md 0.7.4 준수)

- [x] 타입체크: `npx tsc --noEmit` ✅
- [x] 빌드테스트: `npm run build` ✅
- [x] 문서 업데이트 (SUBTASK.md)
- [ ] Git 커밋 & 푸시
- [ ] 완료 보고 & 피드백 요청

---

## 예상 결과물

```
측정 시스템 완성 후:

1. 시범 운영 2주 → 데이터 축적
2. 분석: "영상 1명 = 0.14 GB/분" (실측)
3. 50명 × 5시간 × 22일 = 9.24 TB (실측 기반 예측)
4. 가격 확정: 월 ₩200,000 (마진 45%)
```
