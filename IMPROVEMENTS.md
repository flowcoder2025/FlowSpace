# FlowSpace 개선 권장사항

> **분석일**: 2025-12-19
> **분석 기준**: 코드베이스 기반 (PRD 업데이트 전)

---

## 현재 구현 상태 요약

### 핵심 기능 (18개 모듈)

| 카테고리 | 기능 | 상태 | 비고 |
|---------|------|------|------|
| **인증** | NextAuth 소셜 로그인 | ✅ 완료 | Google/GitHub/Kakao |
| | 게스트 입장 | ✅ 완료 | 닉네임+아바타 선택 |
| | 녹화 동의 시스템 | ✅ 완료 | 법적 준수 |
| **공간 관리** | 공간 CRUD | ✅ 완료 | 생성/수정/삭제/조회 |
| | 초대 코드 입장 | ✅ 완료 | inviteCode 기반 |
| | 접근 제어 | ✅ 완료 | PUBLIC/PRIVATE/PASSWORD |
| | 브랜딩 설정 | ✅ 완료 | 로고/색상/로딩 메시지 |
| **권한** | 역할 시스템 | ✅ 완료 | SuperAdmin/OWNER/STAFF/PARTICIPANT |
| | 멤버 관리 | ✅ 완료 | 역할 변경/강퇴/음소거 |
| **게임** | Phaser 3 엔진 | ✅ 완료 | 2D 맵 렌더링 |
| | 캐릭터 이동 | ✅ 완료 | 8방향 이동 |
| | 맵 에디터 | ✅ 완료 | 오브젝트 배치/저장 |
| **실시간** | Socket.io 동기화 | ✅ 완료 | 위치/상태 동기화 |
| | LiveKit 음성/영상 | ✅ 완료 | WebRTC 기반 |
| **채팅** | 공개/귓속말/파티 | ✅ 완료 | 5종 메시지 타입 |
| | Rate Limiting | ✅ 완료 | 도배 방지 |
| | 메시지 페이지네이션 | ✅ 완료 | cursor 기반 |
| **대시보드** | 공간 통계 | ✅ 완료 | 방문자/체류시간 |

---

## 개선 권장사항

### 🔴 높은 우선순위 (High Priority)

#### 1. CSV 내보내기 기능
**현황**: PRD에 명시되어 있으나 미구현
**권장 작업**:
- [ ] `/api/dashboard/spaces/[id]/export` API 생성
- [ ] 이벤트 로그 CSV 변환 유틸리티
- [ ] 대시보드 UI에 내보내기 버튼 추가

**예상 파일**:
```
src/app/api/dashboard/spaces/[id]/export/route.ts
src/lib/utils/csv-export.ts
```

#### 2. 반응형 디자인 (모바일 뷰어)
**현황**: 데스크톱 UI 중심, 모바일 최적화 부족
**권장 작업**:
- [ ] Tailwind 브레이크포인트 활용 (`sm:`, `md:`, `lg:`)
- [ ] 터치 인터랙션 지원 (게임 캔버스)
- [ ] 모바일용 컨트롤 바 레이아웃
- [ ] 채팅/참가자 패널 모바일 최적화

**주요 수정 파일**:
```
src/features/space/components/SpaceLayout.tsx
src/features/space/components/controls/ControlBar.tsx
src/features/space/components/chat/ChatMessageList.tsx
```

#### 3. 오브젝트 상호작용 연결
**현황**: 맵 에디터로 오브젝트 배치 가능, 상호작용 로직 부분 구현
**권장 작업**:
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

### 🟡 중간 우선순위 (Medium Priority)

#### 4. 템플릿 맵 에셋 완성
**현황**: 템플릿 3종 정의됨 (OFFICE/CLASSROOM/LOUNGE), 에셋 미완성
**권장 작업**:
- [ ] 오피스 맵 타일셋 완성
- [ ] 강의실 맵 타일셋 완성
- [ ] 라운지 맵 타일셋 완성
- [ ] 각 템플릿별 기본 오브젝트 배치

**에셋 경로**:
```
public/assets/game/maps/office.json
public/assets/game/maps/classroom.json
public/assets/game/maps/lounge.json
```

#### 5. 에러 바운더리 강화
**현황**: 기본 에러 처리 존재, 전역 에러 바운더리 미흡
**권장 작업**:
- [ ] React Error Boundary 컴포넌트 추가
- [ ] Phaser 게임 크래시 복구 로직
- [ ] Socket 연결 끊김 재연결 UX
- [ ] API 에러 토스트 통합

**예상 파일**:
```
src/components/ErrorBoundary.tsx
src/features/space/components/GameErrorBoundary.tsx
```

#### 6. 구독 플랜 UI
**현황**: DB 스키마에 Subscription 모델 존재, UI 미구현
**권장 작업**:
- [ ] 가격 페이지 (`/pricing`)
- [ ] 플랜 비교 테이블
- [ ] Stripe 결제 연동 (PRD 명시)
- [ ] 구독 상태 표시 UI

**예상 파일**:
```
src/app/pricing/page.tsx
src/components/PricingTable.tsx
src/app/api/stripe/route.ts
```

---

### 🟢 낮은 우선순위 (Low Priority)

#### 7. AI 도우미 연동
**현황**: 미구현 (향후 확장 가능)
**권장 작업**:
- [ ] 온보딩 NPC 캐릭터
- [ ] Claude API 연동
- [ ] 공간 내 AI 채팅 지원

#### 8. SSO 지원
**현황**: 소셜 로그인만 지원
**권장 작업**:
- [ ] SAML/OIDC 프로바이더 지원
- [ ] 기업 고객용 SSO 설정 페이지
- [ ] 도메인 기반 자동 SSO 라우팅

---

## 코드 품질 개선

### 리팩토링 권장

| 영역 | 현황 | 권장 |
|-----|------|------|
| **타입 정의** | 일부 `any` 사용 | 엄격한 타입 정의 |
| **에러 처리** | try-catch 패턴 혼재 | 통합 에러 핸들러 |
| **테스트** | 수동 테스트 위주 | E2E 테스트 추가 |
| **로깅** | console.log 사용 | 구조화된 로깅 |

### 성능 최적화 권장

| 영역 | 현황 | 권장 |
|-----|------|------|
| **번들 사이즈** | Phaser 전체 로드 | 코드 스플리팅 |
| **이미지** | PNG 에셋 | WebP 변환 + CDN |
| **API 캐싱** | 미적용 | SWR/React Query |
| **SSR** | 부분 적용 | 정적 페이지 확대 |

---

## 보안 점검 항목

- [x] Rate Limiting 적용 (채팅 5msg/5초)
- [x] 권한 미들웨어 (`space-auth.ts`)
- [x] 환경 변수 분리
- [ ] CSRF 토큰 검증 강화
- [ ] API 응답 데이터 최소화
- [ ] 파일 업로드 검증 (향후)

---

## 참고 사항

### 관련 문서
- PRD: `/docs/prd.md`
- DB 스키마: `/prisma/schema.prisma`
- 공간 모듈 가이드: `/src/features/space/claude.md`

### 최근 완료 작업 (2025-12-19)
- 채팅 시스템 최적화 Phase 1-4 완료
- Rate Limiting, 메모리 상한, 렌더 최적화, 페이지네이션

---

*이 문서는 코드베이스 분석 기반으로 작성되었습니다. PRD 업데이트 후 재검토 권장.*
