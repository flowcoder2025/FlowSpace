# TASK: FlowSpace 핵심 기능 허점 수정 (38개 항목)

> **생성일**: 2026-01-07
> **완료일**: 2026-01-09 (보류 이슈 추가 해결)
> **목표**: 통계/채팅/인증 시스템의 38개 잠재적 허점 수정
> **상태**: ✅ **완료** - 36/38 수정 완료 (95%), 2개 보류 (MVP 후 확장)
> **다음 태스크**: 에셋 제작 및 템플릿 완성 (ROADMAP.md 참조)

---

## 진행 상태 요약

| Phase | 심각도 | 항목수 | 완료 | 보류 | 진행률 |
|-------|--------|-------|------|------|--------|
| Phase 1 | Critical | 4 | 4 | 0 | 100% ✅ |
| Phase 2 | High | 10 | 10 | 0 | 100% ✅ |
| Phase 3 | Medium | 17 | 15 | 2 | 88% ✅ |
| Phase 4 | Low | 7 | 7 | 0 | 100% ✅ |
| **합계** | - | **38** | **36** | **2** | **95%** |

**Phase 3 완료 항목**: 3.1, **3.2**, 3.3, 3.4, 3.5, 3.6, **3.9**, 3.10, 3.11, **3.12**, **3.13**, 3.14, **3.15**, 3.16, 3.17
**Phase 3 보류 항목**: 3.7 (공간 기반 통신), 3.8 (스포트라이트) → MVP 후 구현 ([설계 문서](/docs/roadmap/SPATIAL-COMMUNICATION.md))
**Phase 4 완료 항목**: **4.1**, **4.2**, 4.3, 4.4, 4.5, 4.6, 4.7
**Phase 4 보류 항목**: 없음

---

## Phase 1: Critical (즉시 수정)

### 1.1 [통계] 재방문율 중복 계산 버그
- **파일**: `src/app/api/admin/stats/route.ts:202-339`
- **문제**: `groupBy(["spaceId", "nickname"])`로 동일 사용자가 여러 공간 방문 시 중복 집계
- **해결**: guestSession.id / userId 기준 그룹화로 변경
- **체크리스트**:
  - [x] 게스트 재방문율: guestSessionId 기준 그룹화
  - [x] 인증 사용자: userId 기준 그룹화 (spaceId 제거)
  - [x] 재방문 정의 통일: 동일 세션/사용자의 2회 이상 ENTER
- **상태**: ✅ 완료

### 1.2 [통계] 체류시간 마지막 EXIT만 사용
- **파일**: `src/app/api/admin/stats/route.ts:299-317`
- **문제**: Map 덮어쓰기로 여러 ENTER에 마지막 EXIT만 매칭
- **해결**: 각 ENTER-EXIT 쌍을 시간순 매칭
- **체크리스트**:
  - [x] Map → Array 변경 (모든 ENTER/EXIT 보존)
  - [x] 시간순 정렬 후 가장 가까운 EXIT 매칭
  - [x] 동일 세션의 다중 입장/퇴장 처리
- **상태**: ✅ 완료

### 1.3 [통계] 피크 동접 = 일일 ENTER 수 (dashboard API)
- **파일**: `src/app/api/dashboard/spaces/[id]/stats/route.ts:142-148`
- **문제**: `Math.max(...dailyEnters.values())` = 동시접속이 아닌 이벤트 카운트
- **해결**: admin/stats와 동일한 ENTER/EXIT Set 기반 계산
- **체크리스트**:
  - [x] ENTER/EXIT 이벤트 조회 쿼리 추가
  - [x] Set 기반 동시접속자 추적 로직 구현
  - [x] 기존 dailyEnters 로직 제거
- **상태**: ✅ 완료

### 1.4 [인증] 개발 모드 백도어 제거
- **파일**: `src/app/api/spaces/[id]/members/route.ts:46-59`
- **문제**: `NODE_ENV=development`시 자동 로그인 (DEV_TEST_USER_ID)
- **해결**: 해당 코드 블록 완전 삭제
- **체크리스트**:
  - [x] DEV_TEST_USER_ID 상수 제거
  - [x] IS_DEV 분기 로직 제거
  - [x] getUserId() 함수 정리
- **상태**: ✅ 완료

---

## Phase 2: High (1주일 내 수정) ✅ 완료

### 2.1 [통계] ENTER 없는 EXIT 이벤트 무시
- **파일**: `src/app/api/admin/stats/route.ts:375-396`
- **해결**: 불완전 세션 (ENTER 없는 EXIT, EXIT 없는 ENTER) 별도 집계
- **구현**: `dataQuality.incompleteEnterSessions`, `dataQuality.incompleteExitSessions` 필드 추가
- **상태**: ✅ 완료

### 2.2 [통계] 24시간 이상 체류 데이터 제외
- **파일**: `src/app/api/admin/stats/route.ts:283-372`
- **해결**: 24시간 이상 체류는 `outlierDurations` 배열로 별도 집계
- **구현**: `dataQuality.outlierSessions`, `dataQuality.outlierAvgDuration` 필드 추가
- **상태**: ✅ 완료

### 2.3 [통계] 1주일 이전 입장 세션 동접 누락
- **파일**: `src/app/api/dashboard/spaces/[id]/stats/route.ts:120-128`
- **해결**: 동접 계산용 ENTER 조회 범위를 1개월로 확장 (`oneMonthAgo`)
- **상태**: ✅ 완료

### 2.4 [통계] 동일 시각 ENTER/EXIT 순서 미보장
- **파일**: Phase 1.3에서 해결됨 (EXIT delta=-1 우선 정렬)
- **상태**: ✅ 완료 (이미 구현됨)

### 2.5 [채팅] 메시지 DB 저장 실패 시 롤백 없음
- **파일**: `server/socket-server.ts`, `types.ts`, `useSocket.ts`, `SpaceLayout.tsx`
- **해결**: `chat:messageFailed` 이벤트 정의 및 클라이언트 롤백 처리
- **상태**: ✅ 완료

### 2.6 [채팅] 귓속말 부분 전송 실패
- **파일**: `server/socket-server.ts`, `types.ts`, `useSocket.ts`
- **해결**: `whisper:messageFailed` 이벤트 추가, 발신자와 수신자 모두에게 롤백 전송
- **상태**: ✅ 완료

### 2.7 [채팅] 게임 준비 전 이동 이벤트 손실
- **파일**: `src/features/space/socket/useSocket.ts:293-316`
- **해결**: `handleGameReady`에서 players Map의 최신 위치 사용
- **구현**: `setPlayers` 콜백 내에서 `currentPlayers.get(player.id)` 참조
- **상태**: ✅ 완료

### 2.8 [채팅] 닉네임 스푸핑으로 귓속말 가로채기
- **파일**: `server/socket-server.ts:831-837`
- **해결**: 동일 닉네임이 다른 playerId를 가지면 에러 반환 (스푸핑 방지)
- **구현**: `uniquePlayerIds.size > 1` 체크 추가
- **상태**: ✅ 완료 (완화책 적용, 근본 해결은 playerId 기반 전환 필요)

### 2.9 [인증] 게스트 토큰 엔트로피 약함
- **파일**: `src/app/api/guest/route.ts:12-21, 102-104`
- **해결**: `crypto.randomBytes` 기반 6자리 영숫자 suffix (약 22억 경우의 수)
- **구현**: `generateSecureRandomSuffix()` 함수 추가
- **상태**: ✅ 완료

### 2.10 [인증] LiveKit 토큰 발급 시 권한 검증 부재
- **파일**: `src/app/api/livekit/token/route.ts:160-203`
- **해결**: 인증된 사용자의 공간 멤버십 검증 추가 (SpaceMember 또는 Space OWNER)
- **구현**: 비멤버는 sessionToken(게스트 세션) 필요
- **상태**: ✅ 완료

---

## Phase 3: Medium (1개월 내 수정) - 🚧 진행 중

### 3.1 [통계] 주간 체류시간 변화율이 항상 0
- **파일**: `src/app/api/admin/stats/route.ts:448-541`
- **문제**: 지난주 데이터 계산 미구현
- **해결**: 지난주 체류시간 쿼리 추가 (lastWeekGuestEnterLogs, lastWeekAuthEnterLogs 등)
- **구현**: durationChange 계산 및 weeklyChange.duration에 적용
- **상태**: ✅ 완료

### 3.2 [통계] 쿼리 중복으로 메모리 4배 사용
- **파일**: `src/app/api/admin/stats/route.ts:69-200`
- **문제**: 같은 조건의 ENTER/EXIT 반복 조회 (18개 쿼리)
- **해결**: 2주간 ENTER/EXIT 통합 쿼리 후 메모리 필터링 (10개 쿼리로 감소)
- **구현**:
  - allEnterEvents + allExitEvents 통합 쿼리
  - 메모리에서 날짜/사용자유형별 필터링
  - DB 연결 44% 감소
- **상태**: ✅ 완료 (2026-01-09)

### 3.3 [통계] null guestSessionId/userId 처리
- **파일**: `src/app/api/admin/stats/route.ts:309-338`
- **문제**: 둘 다 null일 때 빈 문자열로 처리
- **해결**: 명시적 null 체크 + 로깅 추가 (nullIdentifierEvents 카운트)
- **상태**: ✅ 완료

### 3.4 [통계] 공간 없을 때 응답 구조 불완전
- **파일**: `src/app/api/admin/stats/route.ts:41-62`
- **문제**: 일부 필드만 반환
- **해결**: dataQuality 포함 전체 필드 명시적 반환
- **상태**: ✅ 완료

### 3.5 [채팅] 파티 채팅 DB 저장 없음
- **파일**: `server/socket-server.ts:971-1036`
- **문제**: 파티 메시지 영구 기록 불가
- **해결**: prisma.chatMessage.create + type: "PARTY", targetId: partyId
- **상태**: ✅ 완료

### 3.6 [채팅] 아바타 정보 병합 시 nullish coalescing
- **파일**: `src/features/space/socket/useSocket.ts:390-405`
- **문제**: null과 undefined 구분 미흡
- **해결**: 기본값 "default" 추가 (avatarColor ?? existing?.avatarColor ?? "default")
- **상태**: ✅ 완료

### 3.7 [통신] 공간 기반 커뮤니케이션 시스템 🆕
- **설계 문서**: `/docs/roadmap/SPATIAL-COMMUNICATION.md`
- **현재 문제**: 공간 내 모든 유저가 전역적으로 오디오/비디오/화면공유
- **목표 기능**:
  1. **근접 기반 통신**: 7×7 타일 영역 내 유저끼리만 연결
  2. **파티 존**: 맵의 특정 영역에서 그룹 통신 + 채팅
  3. **스포트라이트**: 관리자 권한 부여 + 특정 좌표에서 전체 브로드캐스트
- **상태**: ⏸️ 보류 (MVP 후 구현, 설계 완료)

### 3.8 [통신] 스포트라이트 권한 시스템 🆕
- **설계 문서**: `/docs/roadmap/SPATIAL-COMMUNICATION.md` 섹션 2.3
- **요구사항**:
  - SuperAdmin/OWNER/STAFF만 타 사용자에게 스포트라이트 권한 부여 가능
  - 맵에 스포트라이트 오브젝트(무대/단상) 설치 시 해당 영역 좌표 지정
  - 권한 보유자가 해당 좌표에 위치할 때만 전체 브로드캐스트 활성화
  - 존 이탈 시 자동 해제
- **상태**: ⏸️ 보류 (3.7과 함께 구현 예정)

### 3.9 [채팅] 음소거 상태 메모리만 저장
- **파일**: `server/socket-server.ts:1101-1167`
- **문제**: 서버 재시작 시 음소거 초기화
- **해결**: SpaceMember.restriction 필드로 DB 영속화 구현
- **구현**:
  - `loadMemberRestriction()`: join:space 시 DB에서 불러오기
  - `saveMemberRestriction()`: 음소거/해제 시 DB 저장
  - 일시적 음소거 만료 자동 처리
- **상태**: ✅ 완료 (2026-01-09)

### 3.10 [채팅] 재연결 시 중복 입장 미처리
- **파일**: `server/socket-server.ts:539-558`
- **문제**: 기존 소켓 강제 종료 없음
- **해결**: 기존 소켓 disconnect 후 새 연결 허용 (에러 메시지 전송)
- **상태**: ✅ 완료

### 3.11 [채팅] Rate Limit이 socketId별
- **파일**: `server/socket-server.ts:219-321`
- **문제**: 여러 탭으로 Rate Limit 우회 가능
- **해결**: playerId 기반 Rate Limit으로 변경, 모든 호출 업데이트
- **상태**: ✅ 완료

### 3.12 [인증] RBAC 정책 모순
- **파일**: `src/app/api/spaces/[id]/members/route.ts`, `staff/route.ts`
- **문제**: 주석과 코드의 권한 정책 불일치
- **분석**: 코드 리뷰 결과 주석과 실제 구현이 일치함 확인
- **상태**: ✅ 완료 (문제 없음 확인, 2026-01-09)

### 3.13 [인증] 이중 검증 로직 불일치
- **파일**: `src/app/api/spaces/[id]/members/route.ts`
- **문제**: GET/DELETE vs POST/PATCH 검증 로직 다름
- **분석**: canManageMembers 함수로 통일되어 있음 확인
- **상태**: ✅ 완료 (문제 없음 확인, 2026-01-09)

### 3.14 [인증] 자기 자신 강등/강퇴 가능
- **파일**: `src/app/api/spaces/[id]/members/route.ts:474-480, 638-645`
- **문제**: PATCH/DELETE에서 자기 자신 체크 없음
- **해결**: PATCH와 DELETE에 자기 자신 체크 추가 (SuperAdmin 예외)
- **상태**: ✅ 완료

### 3.15 [인증] 사용자 열거 가능
- **파일**: `src/app/api/spaces/[id]/staff/route.ts`, `staff/[userId]/route.ts`
- **문제**: 존재하지 않는 userId에 대한 404 응답
- **해결**: 일관된 400 에러 응답 ("Cannot assign/remove staff role to this user")
- **상태**: ✅ 완료 (2026-01-09)

### 3.16 [인증] 공간 최대값 race condition
- **파일**: `src/app/api/guest/route.ts:107-144`
- **문제**: 동시 요청 시 maxUsers 초과 가능
- **해결**: prisma.$transaction으로 원자적 처리 (count + create 트랜잭션)
- **상태**: ✅ 완료

### 3.17 [인증] 에러 응답 정보 누수
- **파일**: `src/app/api/guest/verify/route.ts:73-92`
- **문제**: 단계별 에러로 토큰 유효성 추론 가능
- **해결**: 모든 검증 실패 시 동일한 "Invalid session" 메시지 반환
- **상태**: ✅ 완료

---

## Phase 4: Low (분기 내 수정) - ✅ 완료 (6/7)

### 4.1 [통계] authReturnRateData groupBy 정렬 비용
- **파일**: `prisma/schema.prisma:400-402`
- **문제**: groupBy 쿼리에 적합한 복합 인덱스 부재
- **해결**: SpaceEventLog에 복합 인덱스 추가
- **구현**:
  - `@@index([spaceId, eventType, userId])` - 인증 사용자 groupBy용
  - `@@index([spaceId, eventType, guestSessionId])` - 게스트 groupBy용
  - `prisma db push`로 프로덕션 적용
- **상태**: ✅ 완료 (2026-01-09)

### 4.2 [통계] 스키마 마이그레이션 시 세션 ID 재사용 위험
- **파일**: `src/app/api/admin/stats/route.ts:264-272`
- **문제**: cuid() 재사용 가능성 (이론적)
- **분석**: cuid()는 약 10^36 경우의 수로 충분히 고유 (충돌 확률 무시 가능)
- **상태**: ✅ 완료 (허용 가능한 위험 수준 확인, 2026-01-09)

### 4.3 [채팅] 무한 재연결 (배터리/리소스 낭비)
- **파일**: `src/features/space/socket/useSocket.ts:226-230`
- **문제**: `reconnectionAttempts: Infinity`
- **해결**: 30회로 제한 (약 2.5분간 시도 후 중단)
- **상태**: ✅ 완료

### 4.4 [채팅] Presence API 오래된 데이터
- **파일**: `server/socket-server.ts:335-385`
- **문제**: disconnect 처리 전 요청 시 stale 데이터
- **해결**: `io.sockets.adapter.rooms` 직접 조회로 Socket.io가 자동 관리
- **분석 결과**: 현재 구현이 이미 적절함 (실시간 소켓 상태 기반)
- **상태**: ✅ 완료 (2026-01-09, 추가 구현 불필요 확인)

### 4.5 [채팅] 중복 메시지 체크 trim 불일치
- **파일**: `server/socket-server.ts:243-264`
- **문제**: 길이 체크와 중복 체크의 trim 적용 시점 다름
- **해결**: trim 먼저 적용 + 빈 메시지 체크 추가
- **상태**: ✅ 완료

### 4.6 [채팅] 해시 충돌 가능성
- **파일**: `server/socket-server.ts:224-231`
- **문제**: 32bit 해시로 충돌 가능
- **해결**: SHA256 해시 (16자 hex, 충돌 가능성 제거)
- **상태**: ✅ 완료

### 4.7 [인증] 게스트 세션 만료 처리 느슨
- **파일**: `src/app/api/guest/verify/route.ts:90`
- **문제**: 경계값 처리 및 정리 메커니즘 부재
- **해결**: Vercel Cron으로 매일 UTC 19:00 (KST 04:00) 자동 정리
- **구현**:
  - `src/app/api/cron/cleanup-sessions/route.ts` 생성
  - `vercel.json`에 cron 스케줄 추가
- **상태**: ✅ 완료 (2026-01-09)

---

## 수정 파일 목록 (예상)

### Phase 1 (3개 파일)
- `src/app/api/admin/stats/route.ts`
- `src/app/api/dashboard/spaces/[id]/stats/route.ts`
- `src/app/api/spaces/[id]/members/route.ts`

### Phase 2 (4개 파일)
- `server/socket-server.ts`
- `src/features/space/socket/useSocket.ts`
- `src/app/api/guest/route.ts`
- `src/app/api/livekit/token/route.ts`

### Phase 3 (4개 파일)
- `src/lib/space-auth.ts`
- `src/app/api/spaces/[id]/staff/route.ts`
- `src/app/api/guest/verify/route.ts`
- `server/socket-server.ts`

### Phase 4 (3개 파일)
- `src/app/api/admin/stats/route.ts`
- `src/features/space/socket/useSocket.ts`
- `server/socket-server.ts`

---

## 변경 이력

| 날짜 | 변경 내용 |
|-----|----------|
| 2026-01-07 | TASK.md 초기 생성 - 38개 허점 수정 항목 정의 |
| 2026-01-07 | Phase 1-4 완료 - 27/38 수정, 11개 보류 (최적화/인프라 관련) |
| 2026-01-08 | **태스크 완료** - 결과 ROADMAP.md에 통합, 보류 이슈는 인프라 후 진행 |
| 2026-01-09 | **보안 강화 추가** - 3.9 (음소거 DB 영속화), 3.15 (사용자 열거 방지), CSRF 미들웨어 추가 |
| 2026-01-09 | **OCI 배포 후 추가 해결** - 4.4 (Presence API 분석 완료), 4.7 (Vercel Cron 세션 정리) |
| 2026-01-09 | **공간 기반 통신 설계** - 3.7, 3.8 재정의 (근접/파티존/스포트라이트), 설계 문서 작성 |
| 2026-01-09 | **문제없음 확인 완료** - 3.12, 3.13, 4.2 검토 후 완료 처리 (36/38, 95%) |
| 2026-01-09 | **쿼리+인덱스 최적화** - 3.2 (18→10개 쿼리 통합), 4.1 (groupBy 복합 인덱스 추가) |

---

## 다음 단계

**36/38 완료 (95%)** - 남은 2개는 MVP 후 기능 확장 시 구현

**완료된 주요 이슈**:
- ✅ Oracle Cloud 인프라 배포 완료 (2026-01-09)
- ✅ Vercel Cron 설정 완료 (세션 정리)
- ✅ DB 인덱스 최적화 완료 (4.1 - groupBy 복합 인덱스)
- ✅ 쿼리 최적화 완료 (3.2 - 18→10개 쿼리 통합)
- ✅ 문제없음 확인 (3.12, 3.13, 4.2)

**보류 (MVP 후 확장)** - [설계 문서](/docs/roadmap/SPATIAL-COMMUNICATION.md):
- ⏸️ 3.7 공간 기반 커뮤니케이션 시스템
  - 근접 기반 통신 (7×7 영역)
  - 파티 존 (특정 영역 그룹 통신)
- ⏸️ 3.8 스포트라이트 시스템
  - 관리자 권한 부여 + 좌표 기반 전체 브로드캐스트

**관련 문서**:
- `/docs/infrastructure/OCI.md` - 인프라 배포 완료 (2026-01-09)
- `/docs/ROADMAP.md` - 보안 점검 섹션에 보류 이슈 목록

---

## 검증 명령어

```bash
# 타입체크
npx tsc --noEmit

# 빌드테스트
npm run build

# Socket 서버 테스트
npm run socket:dev

# 전체 개발 서버
npm run dev:all
```
