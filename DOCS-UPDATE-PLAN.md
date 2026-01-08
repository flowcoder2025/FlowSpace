# FlowSpace 문서 업데이트 계획

> **생성일**: 2026-01-08
> **목적**: 코드베이스와 문서 간 불일치 해소, 현행화
> **상태**: 🔄 피드백 대기

---

## 1. 현재 상태 진단

### 1.1 문서 vs 코드 불일치 요약

| 문서 | 현재 상태 | 코드 실제 상태 | 불일치 |
|-----|----------|--------------|:------:|
| **PRD.md** | Phase 5 진행중 (2025-12-16) | Phase 5 대부분 완료 + 보안 허점 수정 71% | 🔴 |
| **ROADMAP.md** | 2025-12-29 기준 | TASK.md에서 38개 허점 수정 작업 완료 | 🟡 |
| **flowspace.md** | 2025-12-11 기준 | 미디어 설정, 에러 바운더리, 반응형 추가됨 | 🔴 |
| **space/claude.md** | 2026-01-06 기준 | 비교적 최신 (미디어 설정 반영) | 🟢 |
| **server/claude.md** | 2025-12-15 기준 | Rate limiting, 메시지 실패 롤백 등 추가됨 | 🟡 |
| **backup.md** | 2025-12-19 기준 | 이후 많은 변경 발생 | 🔴 삭제 권장 |

### 1.2 신규 생성된 문서 (미통합)

| 문서 | 내용 | 상태 |
|-----|------|------|
| **OCI.md** | Oracle Cloud 통합 배포 계획 | ✅ 완성 (미실행) |
| **TODO-PENDING.md** | 에셋 대기 작업 목록 | ✅ 완성 |
| **TASK.md** | 38개 허점 수정 진행 상황 | ✅ 완성 (71% 완료) |
| **ASSET-PIPELINE.md** | 캐릭터 스프라이트 변환 가이드 | ✅ 완성 |
| **CHARACTER.md** | 캐릭터 커스터마이징 설계 | ✅ 완성 |
| **ASSETS.md** | 에셋 분석 및 가공 계획 | ✅ 완성 |

### 1.3 인프라 상태

| 항목 | 현재 | 계획 | 상태 |
|-----|------|------|:----:|
| **Next.js** | Vercel | Vercel 유지 | ✅ |
| **Socket.io** | Railway (유료) | Oracle Always Free | ⏳ 미실행 |
| **LiveKit** | LiveKit Cloud (한도 초과) | Oracle Self-hosted | ⏳ 미실행 |
| **Database** | Supabase PostgreSQL | 유지 | ✅ |

---

## 2. 업데이트 대상 문서 목록

### 2.1 필수 업데이트 (High Priority)

| # | 문서 | 업데이트 내용 | 예상 시간 |
|:-:|------|-------------|:--------:|
| 1 | **docs/prd.md** | Phase 상태 전면 재정리, 인프라 계획 반영 | 30분 |
| 2 | **docs/ROADMAP.md** | TASK.md 결과 통합, 우선순위 재조정 | 20분 |
| 3 | **docs/architecture/flowspace.md** | 실제 구현 상태 반영, 인프라 섹션 추가 | 30분 |
| 4 | **CLAUDE.md** | 문서 계층 업데이트, 신규 파일 참조 | 15분 |

### 2.2 선택적 업데이트 (Medium Priority)

| # | 문서 | 업데이트 내용 | 예상 시간 |
|:-:|------|-------------|:--------:|
| 5 | **server/claude.md** | 최신 이벤트, 보안 강화 반영 | 15분 |
| 6 | **docs/changes/changelog.md** | 2025-12-19 이후 변경 이력 추가 | 15분 |

### 2.3 정리 대상 (삭제/통합)

| # | 문서 | 조치 | 이유 |
|:-:|------|------|------|
| 7 | **backup.md** | 삭제 | changelog + ROADMAP으로 대체 |
| 8 | **TASK.md** | 완료 후 아카이브 | 진행 중 → 완료 전환 |

---

## 3. 업데이트 상세 계획

### 3.1 PRD.md 업데이트

**현재 문제**:
- Phase 5가 "진행중"이나 대부분 완료됨
- Phase 6 이후 내용이 코드와 맞지 않음
- 인프라 계획(OCI) 미반영

**업데이트 내용**:

```markdown
## 12. 릴리즈 계획 (Roadmap) - 업데이트 예시

### Phase 5: 통합 및 Polish ✅ 완료 (2026-01-07)
- [x] 전체 플로우 통합
- [x] 에러 처리 및 로딩 상태
- [x] 플로팅 채팅 오버레이
- [x] 귓속말/파티 채팅 시스템
- [x] VideoTile 아바타 색상
- [x] 아바타 색상 검증
- [x] 반응형 디자인 기초
- [x] 에러 바운더리 강화
- [x] 보안 허점 수정 (27/38개, 71%)

### Phase 6: 인프라 최적화 🔄 진행중
- [ ] Oracle Cloud 통합 배포 (LiveKit + Socket.io)
- [ ] LiveKit Cloud → Self-hosted 전환
- [ ] Railway → Oracle 마이그레이션

### Phase 7: 에셋 완성 📋 대기
- [ ] 48×64 캐릭터 스프라이트 제작
- [ ] 3종 템플릿 맵 완성
- [ ] 오브젝트 상호작용 연결
```

### 3.2 ROADMAP.md 업데이트

**현재 문제**:
- TASK.md 결과가 미반영
- 우선순위가 실제 상황과 맞지 않음

**업데이트 내용**:

```markdown
## 2. 우선순위 작업 목록 - 업데이트 예시

### 2.1 즉시 필요 (High Priority)

| 순서 | 작업 | 상태 | 비고 |
|:---:|------|:----:|------|
| 1 | Oracle Cloud 통합 배포 | ⏳ | OCI.md 참조, 협의 후 진행 |
| 2 | 커스텀 캐릭터 좌표 수정 | ⏳ | 에셋 파이프라인 문제 |
| 3 | 보류된 보안 이슈 (11개) | ⏳ | 인프라 의존 |

### 2.2 완료된 작업 (from TASK.md)

| 작업 | 완료일 | 비고 |
|------|-------|------|
| 보안 허점 Phase 1-4 | 2026-01-07 | 27/38개 수정 |
| 반응형 디자인 기초 | 2025-12-29 | ROADMAP 9순위 |
| 에러 바운더리 강화 | 2025-12-29 | ROADMAP 10순위 |
```

### 3.3 flowspace.md 업데이트

**현재 문제**:
- 인프라 섹션 없음 (OCI 계획 미반영)
- 미디어 설정 시스템 미반영
- 보안 강화 사항 미반영

**업데이트 내용**:

```markdown
## 추가 섹션 예시

### 10. 인프라 아키텍처

#### 10.1 현재 구조
- Next.js: Vercel
- Socket.io: Railway (유료)
- LiveKit: LiveKit Cloud (한도 초과)

#### 10.2 목표 구조 (OCI.md 참조)
- Next.js: Vercel (유지)
- Socket.io + LiveKit: Oracle Always Free

### 11. 미디어 설정 시스템 (2026-01 추가)
- MediaSettingsModal: 디스코드 스타일 설정 패널
- AudioSettingsTab: 잡음/에코 제거, 입력 감도
- VideoSettingsTab: 해상도, 프레임레이트, 미러 모드
```

### 3.4 CLAUDE.md 업데이트

**현재 문제**:
- 신규 문서(OCI.md, ASSET-PIPELINE.md) 참조 없음
- TASK.md 라이프사이클 설명 부족

**업데이트 내용**:

```markdown
## 0.1 계층 구조 - 업데이트 예시

├── /TASK.md                        ← 🎯 현재 진행 중인 태스크
├── /OCI.md                         ← 🔧 인프라 배포 계획 (NEW)
│
├── /docs/ROADMAP.md                ← 📋 통합 개발 로드맵
│   ├── /docs/roadmap/CHARACTER.md  ← 캐릭터 커스터마이징 설계
│   ├── /docs/roadmap/ASSETS.md     ← 에셋 분석 및 가공 계획
│   └── /docs/roadmap/ASSET-PIPELINE.md ← 에셋 변환 파이프라인 (NEW)
```

---

## 4. 알려진 기술 이슈 (코드 문제)

### 4.1 커스텀 캐릭터 좌표 문제

**증상**: Claude로 에셋 작업 시 좌표값 추출 실패
- 머리 잘림
- 몸통/머리 위치 바뀜

**근본 원인**: 
- Nanobanana3 AI 생성 이미지의 불규칙성
- JPEG 압축 아티팩트로 인한 크로마키 오염
- 스프라이트시트 그리드 정렬 오차

**관련 파일**:
- `docs/roadmap/ASSET-PIPELINE.md` - 변환 파이프라인
- `src/features/space/game/sprites/CharacterSprite.ts` - 스프라이트 로드

**권장 해결**:
1. 원본 이미지 수동 검증 (192×256, 4×4 그리드)
2. Python 스크립트로 프레임별 정렬 확인
3. 필요 시 수동 좌표 조정

### 4.2 LiveKit 프리티어 한도 초과

**증상**: 음성/영상 기능 사용 불가

**현재 설정** (코드 분석 결과):
- Production: `wss://flowspace-3mxv3iyf.livekit.cloud`
- API Key: `APIgGDwEsi7YgMS` (`.env.production`)
- 토큰 API: `/api/livekit/token` ✅ 정상 동작

**해결 계획**: OCI.md 참조
- Oracle Always Free에 LiveKit Self-hosted
- Socket.io도 함께 마이그레이션
- 예상 비용: $0/월

**상태**: 동업자 협의 후 진행 예정

### 4.3 LiveKit Dev Script 누락

**증상**: `npm run livekit:dev` 실행 시 `scripts/livekit-dev.js` 파일 없음 오류

**현재 상태**:
- `package.json`에 스크립트 정의됨: `node scripts/livekit-dev.js`
- 실제 파일: **존재하지 않음**
- `.bin/livekit-server.exe` 바이너리는 존재

**해결 필요**:
```javascript
// scripts/livekit-dev.js 생성 필요
const { spawn } = require('child_process');
const path = require('path');

const livekit = spawn(path.join(__dirname, '../.bin/livekit-server.exe'), [
  '--config', path.join(__dirname, '../livekit.yaml'),
  '--dev'
]);
```

### 4.3 보류된 보안 이슈 (11개)

| 항목 | 사유 | 의존성 |
|-----|------|--------|
| DB 인덱스 최적화 | 스키마 변경 필요 | 인프라 |
| Presence API TTL | 메커니즘 필요 | 인프라 |
| 게스트 세션 정리 | cron job 필요 | 인프라 |
| 파티 권한 검증 | 기능 확장 시 | - |
| 음소거 영속화 | 관리자 기능 확장 시 | - |
| ... | ... | ... |

---

## 5. 실행 계획

### Phase A: 문서 현행화 (오늘)

```
1. PRD.md 업데이트 (Phase 상태 재정리)
2. ROADMAP.md 업데이트 (TASK.md 통합)
3. flowspace.md 업데이트 (인프라 섹션)
4. CLAUDE.md 업데이트 (신규 문서 참조)
5. backup.md 삭제
```

### Phase B: 인프라 결정 (협의 필요)

```
1. Oracle Cloud 배포 방식 결정 (Option C: Resource Manager 권장)
2. 도메인 결정 (자체 도메인 vs 무료 서비스)
3. 배포 일정 확정
```

### Phase C: 코드 이슈 해결 (에셋 준비 후)

```
1. 커스텀 캐릭터 좌표 문제 해결
2. 에셋 통합 및 맵 완성
3. 오브젝트 상호작용 연결
```

---

## 6. 피드백 요청 사항

### 6.1 문서 업데이트 범위

- [ ] Phase A (문서 현행화)만 진행
- [ ] Phase A + backup.md 삭제
- [ ] 전체 진행 (Phase A-C)

### 6.2 인프라 결정

- [ ] Oracle Cloud 배포 진행 (OCI.md 기반)
- [ ] 보류 (추후 결정)
- [ ] 다른 방안 검토 필요

### 6.3 에셋 파이프라인

- [ ] 현재 ASSET-PIPELINE.md로 충분
- [ ] 추가 가이드 필요
- [ ] 직접 제작 예정 (Claude 미사용)

### 6.4 TASK.md 처리

- [ ] 완료 후 아카이브 (`/docs/changes/` 이동)
- [ ] 삭제
- [ ] 현재 상태 유지

---

## 7. 예상 결과물

문서 업데이트 완료 시:

| 문서 | 상태 |
|-----|:----:|
| PRD.md | ✅ 최신 (Phase 6-7 반영) |
| ROADMAP.md | ✅ 최신 (TASK 통합) |
| flowspace.md | ✅ 최신 (인프라 추가) |
| CLAUDE.md | ✅ 최신 (계층 업데이트) |
| changelog.md | ✅ 최신 (이력 추가) |
| backup.md | ❌ 삭제됨 |

---

## 변경 이력

| 날짜 | 변경 |
|-----|------|
| 2026-01-08 | 초기 생성 - 문서 불일치 진단 및 업데이트 계획 |

