# FlowSpace 개발 로드맵

> **최종 업데이트**: 2026-01-08
> **PRD 참조**: `/docs/prd.md`
> **상위 문서**: `/CLAUDE.md` (루트 헌법)

---

## 1. 현재 상태 요약

### 1.1 전체 완성도

| 영역 | 완성도 | 상태 |
|-----|--------|------|
| **API 라우트** | 32개 중 32개 | ✅ 완료 |
| **핵심 기능** | 18개 모듈 | ✅ 완료 |
| **게임 엔진** | 12개 모듈 | ✅ 완료 |
| **채팅 시스템** | 최적화 완료 | ✅ (2025-12-19) |
| **권한 시스템** | 구독 기반 | ✅ (2025-12-28) |
| **보안 허점 수정** | 27/38개 (71%) | ✅ (2026-01-08) |
| **전체 MVP** | ~70% | ⚠️ 에셋/인프라 의존 |

### 1.2 완료된 핵심 기능

| 카테고리 | 기능 | 상태 |
|---------|------|------|
| **인증** | NextAuth 소셜 로그인 (Google/GitHub/Kakao) | ✅ |
| | 게스트 입장 (닉네임+아바타) | ✅ |
| | 녹화 동의 시스템 | ✅ |
| **공간 관리** | 공간 CRUD | ✅ |
| | 초대 코드 입장 | ✅ |
| | 접근 제어 (PUBLIC/PRIVATE/PASSWORD) | ✅ |
| | 브랜딩 설정 | ✅ |
| | **공간 생성 권한 제한** | ✅ (2025-12-28) |
| **권한** | 역할 시스템 (SuperAdmin/OWNER/STAFF/PARTICIPANT) | ✅ |
| | 멤버 관리 (역할 변경/강퇴/음소거) | ✅ |
| **게임** | Phaser 3 엔진 (2D 맵 렌더링) | ✅ |
| | 캐릭터 이동 (8방향) | ✅ |
| | 맵 에디터 (오브젝트 배치/저장) | ✅ |
| **실시간** | Socket.io 동기화 | ✅ |
| | LiveKit 음성/영상 | ✅ |
| **채팅** | 공개/귓속말/파티 (5종 메시지 타입) | ✅ |
| | Rate Limiting + 페이지네이션 | ✅ |
| **대시보드** | 공간 통계 (방문자/체류시간) | ✅ |

---

## 2. 우선순위 작업 목록

### 2.1 즉시 필요 (High Priority)

| 순서 | 작업 | 상태 | 근거 | 상세 |
|:---:|------|:----:|------|------|
| 1 | `/pricing` 페이지 | ✅ | NoPermissionView에서 링크됨 | 2025-12-29 완료 |
| 2 | CSV 내보내기 | ✅ | PRD 명시, 에셋 불필요 | 2025-12-29 완료 |
| 3 | AvatarColor 8개 통일 | ✅ | 기술 부채, CHARACTER Phase 0 | 2025-12-29 완료 |

### 2.2 중간 우선순위 (Medium Priority)

| 순서 | 작업 | 상태 | 근거 | 상세 |
|:---:|------|:----:|------|------|
| 4 | 빌드 경고 정리 | ✅ | 21개 경고 해결 | 2025-12-29 완료 |
| 5 | 캐릭터 커스터마이징 Phase 0-2 | ✅ | DB/소켓, 에셋 없이 가능 | 2025-12-29 완료 (Phase 2 소켓 최적화 포함) |
| 6 | 에셋 제작 (48×64) | ❌ | 외부 의존 | [ASSETS.md](./roadmap/ASSETS.md) |
| 7 | 템플릿 맵 완성 | ⚠️ | OFFICE 90%, CLASSROOM 85%, LOUNGE 70% | [ASSETS.md](./roadmap/ASSETS.md) |

### 2.3 장기 우선순위 (Low Priority)

| 순서 | 작업 | 상태 | 근거 |
|:---:|------|:----:|------|
| 8 | 오브젝트 상호작용 연결 | ⚠️ 부분 | 에셋 완성 후 |
| 9 | 반응형 디자인 | ✅ | 2025-12-29 완료 |
| 10 | 에러 바운더리 강화 | ✅ | 2025-12-29 완료 |
| 11 | AI 도우미 연동 | ❌ | 향후 확장 |
| 12 | SSO 지원 | ❌ | 기업 고객용 |

---

## 3. 기능별 상세 계획

### 3.1 CSV 내보내기 ✅ 완료

**현황**: 2025-12-29 구현 완료

**구현 내용**:
- [x] `/api/dashboard/spaces/[id]/export` API 생성
- [x] 이벤트 로그 CSV 변환 유틸리티 (`csv-export.ts`)
- [x] 대시보드 UI에 내보내기 버튼 추가

**구현 파일**:
```
src/app/api/dashboard/spaces/[id]/export/route.ts  ✅
src/lib/utils/csv-export.ts                         ✅
src/app/dashboard/spaces/[id]/page.tsx              ✅ (버튼 추가)
```

### 3.2 구독 플랜 UI

**현황**: DB 스키마에 Subscription 모델 존재, 권한 체크 구현 완료 (2025-12-28)

**필요 작업**:
- [ ] 가격 페이지 (`/pricing`)
- [ ] 플랜 비교 테이블
- [ ] Stripe 결제 연동
- [ ] 구독 상태 표시 UI

**예상 파일**:
```
src/app/pricing/page.tsx
src/components/PricingTable.tsx
src/app/api/stripe/route.ts
```

### 3.3 반응형 디자인

**현황**: 데스크톱 UI 중심, 모바일 최적화 부족 (~30%)

**필요 작업**:
- [ ] Tailwind 브레이크포인트 활용
- [ ] 터치 인터랙션 지원 (게임 캔버스)
- [ ] 모바일용 컨트롤 바 레이아웃
- [ ] 채팅/참가자 패널 모바일 최적화

**주요 수정 파일**:
```
src/features/space/components/SpaceLayout.tsx
src/features/space/components/controls/ControlBar.tsx
src/features/space/components/chat/ChatMessageList.tsx
```

### 3.4 오브젝트 상호작용 연결

**현황**: 맵 에디터로 오브젝트 배치 가능, 상호작용 로직 부분 구현

**필요 작업**:
- [ ] 링크 오브젝트 → URL 오픈
- [ ] 공지 오브젝트 → 모달 표시
- [ ] 설문 오브젝트 → 외부 폼 연결
- [ ] 포털 오브젝트 → 맵 간 이동

**주요 수정 파일**:
```
src/features/space/game/objects/InteractiveObject.ts
src/features/space/game/scenes/MainScene.ts
```

---

## 4. 코드 품질

### 4.1 빌드 경고 목록 ✅ 완료 (2025-12-29)

**해결된 경고 21개**:
- API 라우트: `mute/route.ts` (`updatedMember`)
- 페이지: `spaces/new/page.tsx` (`Heading`), `[inviteCode]/page.tsx` (`Grid`, `GridItem`, `CardDescription`)
- 컴포넌트: `MemberList.tsx`, `ChatInputArea.tsx`, `ChatMessageList.tsx`, `FloatingChatOverlay.tsx`, `EditorPanel.tsx`, `SpaceLayout.tsx`, `ParticipantPanel.tsx`
- 게임 엔진: `MainScene.ts`, `TilesetGenerator.ts`, `TileSystem.ts`
- 훅: `useDebouncedEditorSave.ts`, `useEditorCommands.ts`, `useScreenRecorder.ts`, `useEditorSocket.ts`

### 4.2 리팩토링 권장

| 영역 | 현황 | 권장 |
|-----|------|------|
| **타입 정의** | 일부 `any` 사용 | 엄격한 타입 정의 |
| **에러 처리** | try-catch 패턴 혼재 | 통합 에러 핸들러 |
| **테스트** | 수동 테스트 위주 | E2E 테스트 추가 |
| **로깅** | console.log 사용 | 구조화된 로깅 |

### 4.3 성능 최적화 권장

| 영역 | 현황 | 권장 |
|-----|------|------|
| **번들 사이즈** | Phaser 전체 로드 | 코드 스플리팅 |
| **이미지** | PNG 에셋 | WebP 변환 + CDN |
| **API 캐싱** | 미적용 | SWR/React Query |
| **SSR** | 부분 적용 | 정적 페이지 확대 |

---

## 5. 보안 점검

### 5.1 완료된 보안 강화 (TASK.md 결과, 2026-01-08)

**총 38개 허점 중 27개 수정 완료 (71%)**

| Phase | 심각도 | 완료 | 주요 내용 |
|-------|--------|:----:|----------|
| Phase 1 | Critical | 4/4 | 재방문율 계산, 피크 동접, 체류시간 버그, 개발 백도어 제거 |
| Phase 2 | High | 10/10 | ENTER/EXIT 매칭, Rate Limit, 귓속말 롤백, LiveKit 권한 |
| Phase 3 | Medium | 10/17 | 파티 DB 저장, 자기 강퇴 방지, 에러 정보 누수 |
| Phase 4 | Low | 3/7 | 재연결 제한, 해시 충돌, 중복 메시지 |

### 5.2 보류된 이슈 (11개) - 인프라 의존

- [ ] DB 인덱스 최적화 (스키마 변경)
- [ ] Presence API TTL (메커니즘 필요)
- [ ] 게스트 세션 정리 (cron job)
- [ ] 파티 권한 검증 (기능 확장 시)
- [ ] 음소거 영속화 (관리자 기능)
- [ ] 쿼리 중복 최적화 (리팩토링)

### 5.3 기존 체크리스트

- [x] Rate Limiting 적용 (playerId 기반으로 강화됨)
- [x] 권한 미들웨어 (`space-auth.ts`)
- [x] 환경 변수 분리
- [x] 구독 기반 공간 생성 권한
- [x] 메시지 실패 롤백 (chat:messageFailed, whisper:messageFailed)
- [x] 닉네임 스푸핑 완화
- [x] 게스트 토큰 엔트로피 강화 (crypto.randomBytes)
- [ ] CSRF 토큰 검증 강화
- [ ] API 응답 데이터 최소화
- [ ] 파일 업로드 검증 (향후)

---

## 6. 하위 문서 참조

| 문서 | 내용 | 경로 |
|-----|------|------|
| **캐릭터 커스터마이징** | 48×64 고해상도, Layer Compositing, 7단계 로드맵 | [roadmap/CHARACTER.md](./roadmap/CHARACTER.md) |
| **에셋 분석** | 5개 파일 분석, 템플릿 커버리지, 가공 계획 | [roadmap/ASSETS.md](./roadmap/ASSETS.md) |

---

## 7. 완료 이력

| 날짜 | 작업 | 관련 파일 |
|-----|------|----------|
| 2026-01-08 | **보안 허점 수정 27/38개 (71%)** | `/TASK.md` 참조 - 통계/채팅/인증 강화 |
| 2026-01-07 | 브라우저 종료 시 EXIT 이벤트 누락 수정 | `socket-server.ts`, `SpaceLayout.tsx` |
| 2026-01-07 | 피크 동접/체류시간 계산 로직 수정 | `admin/stats/route.ts`, `dashboard/stats/route.ts` |
| 2026-01-06 | 모바일 전용 채팅 UI + 뷰포트 개선 | `SpaceLayout.tsx`, `MobileChatOverlay.tsx` |
| 2026-01-06 | 화면공유 딜레이/멈춤 문제 해결 | `LiveKitRoomProvider.tsx` |
| 2026-01-05 | AudioWorklet 노이즈 게이트 구현 | `worklets/noise-gate-processor.ts` |
| 2026-01-04 | 디스코드 스타일 미디어 설정 시스템 | `MediaSettingsModal.tsx`, `AudioSettingsTab.tsx` |
| 2025-12-31 | 원격 플레이어 걷기 애니메이션 수정 | `CharacterSprite.ts`, `MainScene.ts` |
| 2025-12-29 | 반응형 디자인 (ROADMAP 9순위) | `SpaceLayout.tsx`, `ControlBar.tsx`, `useChatDrag.ts` |
| 2025-12-29 | 에러 바운더리 강화 (ROADMAP 10순위) | `lib/errors/index.ts`, `space/[id]/error.tsx`, `ErrorBoundary.tsx` |
| 2025-12-29 | 캐릭터 커스터마이징 Phase 0-2 (ROADMAP 5순위) | `avatar/avatar.schema.ts`, `socket/types.ts`, `socket-server.ts`, `useSocket.ts` |
| 2025-12-29 | 빌드 경고 정리 (ROADMAP 4순위) | 17개 파일 수정 (미사용 import/변수 제거) |
| 2025-12-29 | AvatarColor 8개 통일 (ROADMAP 3순위) | `socket/types.ts`, `page.tsx`, `GameCanvas.tsx`, `PhaserGame.tsx` |
| 2025-12-29 | CSV 내보내기 구현 (ROADMAP 2순위) | `/lib/utils/csv-export.ts`, `/api/dashboard/spaces/[id]/export/route.ts` |
| 2025-12-29 | `/pricing` 페이지 구현 (ROADMAP 1순위) | `/pricing/page.tsx`, `text-config.ts` |
| 2025-12-28 | 공간 생성 권한 제한 (SuperAdmin/구독자만) | `space-auth.ts`, `/spaces/new/page.tsx` |
| 2025-12-19 | 채팅 시스템 최적화 Phase 1-4 | 채팅 모듈 전체 |
| 2025-12-15 | 권한 시스템 리팩토링 | `space-auth.ts`, `space-permissions.ts` |

---

## 변경 이력

| 날짜 | 버전 | 변경 |
|-----|------|------|
| 2026-01-08 | 2.0.0 | TASK.md 결과 통합 - 보안 허점 27/38개 수정, Git 커밋 이력 반영 |
| 2025-12-29 | 1.3.0 | ROADMAP 9순위 완료 - 반응형 디자인 (SpaceLayout, ControlBar, useChatDrag) |
| 2025-12-29 | 1.2.0 | ROADMAP 10순위 완료 - 에러 바운더리 강화 (AppError, ErrorBoundary) |
| 2025-12-29 | 1.1.0 | ROADMAP 5순위 완료 - 캐릭터 커스터마이징 Phase 1-2 (DB/소켓) |
| 2025-12-29 | 1.0.0 | 초기 생성 - GPT.md, new.md, IMPROVEMENTS.md 통합 |
