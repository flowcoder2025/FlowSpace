# /docs - FlowSpace 문서 (SSOT)

> **프로젝트**: FlowSpace - ZEP-감성 2D 메타버스 플랫폼
> **핵심**: PRD 기반 개발, 문서 자동 생성 금지

---

## 📌 핵심 문서

| 문서 | 역할 | 상태 |
|-----|------|------|
| **PRD.md** | 제품 요구사항 정의서 | ✅ Phase 5 진행중, Phase 6 계획 |
| `/CLAUDE.md` | 루트 헌법 (전역 원칙) | ✅ 최신 |
| `architecture/flowspace.md` | FlowSpace 아키텍처 | ✅ 채팅/비디오 업데이트 |

---

## 토큰 효율 원칙

```
1. 문서는 자동으로 생성/갱신하지 않는다
2. 업데이트는 사용자 명시적 요청 시만
3. 전체 재작성 금지, 델타만 기록
4. 응답 형식: 설계 요약 → 코드
5. Feature Batch 완료 후 요청 시만 문서화
```

---

## 구조

```
/docs
├── README.md                 # [현재] 가이드
├── PRD.md                    # 📌 제품 요구사항 (핵심)
│
├── architecture/             # 시스템 아키텍처
│   ├── flowspace.md         # 📌 FlowSpace 아키텍처
│   ├── phase6-permissions-spec.md # 📌 Phase 6 권한/구독 스펙 (신규)
│   └── ui-system-overview.md # UI 시스템 연결 지도
│
├── foundations/              # UI 시스템 전역 규칙
│   ├── naming.md            # ID 체계
│   ├── tokens.md            # 디자인 토큰
│   ├── i18n.md              # 다국어/톤
│   ├── accessibility.md     # 접근성
│   └── semantic.md          # 의미 레벨
│
├── checklists/               # 품질 검증
│   ├── button.md
│   ├── modal.md
│   └── a11y.md
│
├── components/               # 컴포넌트 스펙 (필요 시만)
│   └── _template.md
│
├── workflow/                 # 개발 프로세스
│   └── new-component.md
│
└── changes/
    └── changelog.md          # 변경 이력
```

---

## 빠른 참조

### FlowSpace 개발 시

| 작업 | 참조 문서 |
|-----|----------|
| 전체 요구사항 확인 | `PRD.md` |
| 아키텍처/기술스택 | `architecture/flowspace.md` |
| 공간 기능 개발 | `/src/features/space/claude.md` |
| Socket.io 서버 | `/server/claude.md` |
| 전역 규칙 | `/CLAUDE.md` |

### UI 시스템

| 용도 | 위치 |
|-----|------|
| 전체 구조 | `architecture/ui-system-overview.md` |
| 버튼 검증 | `checklists/button.md` |
| 모달 검증 | `checklists/modal.md` |
| 접근성 검증 | `checklists/a11y.md` |
| 새 컴포넌트 | `workflow/new-component.md` |

---

## 개발 로드맵 (PRD 기준)

### ✅ 완료

| Phase | 내용 |
|-------|------|
| Phase 1 | 기반 UI (레이아웃, 패널, 컨트롤바) |
| Phase 2 | 게임 엔진 (Phaser 3, 타일맵, 캐릭터) |
| Phase 3 | 멀티플레이어 (Socket.io, 채팅, 동기화) |
| Phase 4 | 음성/영상 (LiveKit 연동) ⚠️ 이슈 있음 |

### 🔄 진행중

| Phase | 내용 |
|-------|------|
| Phase 5 | 통합 및 Polish (채팅 오버레이 ✅, 반응형, 템플릿) |

### 📋 계획

| Phase | 내용 |
|-------|------|
| Phase 6 | 권한/구독 시스템 (SaaS 모델, 채팅 관리) |

---

## 사용 흐름

```
PRD 확인 → claude.md 로드 → 코딩 → 체크리스트 검증
                                       ↓
              (Feature Batch 완료 후 문서 요청 시)
                                       ↓
                              델타 업데이트만
```
