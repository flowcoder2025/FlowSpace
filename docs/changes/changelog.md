# Changelog

> Feature Batch 완료 시 변경 내용 기록

---

## [2025-12-09] 캐릭터 스프라이트 Missing Texture 버그 수정

### 수정

**근본 원인 해결**:
- Google 로그인 사용자의 `avatarColor`가 프로필 이미지 URL로 설정되는 버그 수정
- Phaser에서 `character-https://...` 텍스처 키를 찾지 못해 "Missing Texture" 발생

**변경 파일**:
- `/src/app/space/[id]/page.tsx`
  - 아바타 색상 유효성 검사 헬퍼 함수 추가 (`isValidAvatarColor`, `getSafeAvatarColor`)
  - `VALID_AVATAR_COLORS` 상수 정의 (`socket/types.ts`의 `AvatarColor`와 일치)
  - 로그인 사용자 및 게스트 세션 모두에 색상 검증 적용

**패턴**:
```tsx
const VALID_AVATAR_COLORS = ["default", "red", "green", "purple", "orange", "pink"] as const

function getSafeAvatarColor(value: unknown): LocalAvatarColor {
  return isValidAvatarColor(value) ? value : "default"
}
```

---

## [2025-12-08] PRD 재정립 및 문서 구조 개선

### 변경

**PRD.md 업데이트**:
- Phase 1-4 완료 상태 반영
- Phase 5 진행중 항목 정리
- Phase 4 비디오 이슈 표시 추가
- 버전 v0.3 업데이트

**신규 claude.md 추가**:
- `/src/features/space/claude.md` - 핵심 Space 모듈 가이드
- `/server/claude.md` - Socket.io 서버 가이드

**CLAUDE.md 계층구조 확장**:
- Space 모듈 claude.md 연결 추가
- Server claude.md 연결 추가
- 작업 유형별 필수 참조 테이블 업데이트

**docs/ 폴더 재정립**:
- `README.md` - FlowSpace 프로젝트 컨텍스트 추가
- `architecture/flowspace.md` - FlowSpace 아키텍처 문서 신규 생성
- 로드맵 현황 추가 (Phase 완료 상태)

### 분석 결과

**구현 완료 (Phase 1-4)**:
- 기반 UI: SpaceLayout, 리사이즈 패널, 컨트롤바
- 게임 엔진: Phaser 3, 타일맵, 캐릭터 스프라이트
- 멀티플레이어: Socket.io, 위치 동기화, 채팅, 세션 검증
- 음성/영상: LiveKit 연동, VideoTile, ScreenShare

**진행중 (Phase 5)**:
- 반응형 디자인 최적화
- 템플릿 맵 에셋 (3종)
- 오브젝트 상호작용 기능
- CSV 내보내기

**알려진 이슈**:
- 비디오 기능 일부 문제 (분석 예정)

---

## [2025-12-05] Initial Setup

### 추가
- foundations/: naming, tokens, i18n, accessibility, semantic
- components/: button, modal, form, icon, _template
- checklists/: button, modal, a11y
- architecture/: ui-system-overview
- workflow/: new-component

### 규칙
- 토큰 효율 원칙 적용 (자동 문서 생성 금지)
- 응답 형식: 설계 요약 → 코드
- 문서는 사용자 요청 시만 업데이트
