# Flow UI Skill v2.0.0

> **"Primary Color만 바꾸면 브랜드 완성"**

자연어 요청으로 정의된 룰에 따라 완성형 UI를 생성하는 Claude Code 디자인 시스템 스킬

---

## 핵심 가치

- **One Change, Full Brand**: `--primary` 값만 변경하면 전체 UI가 새 브랜드로 반영
- **자연어 → 완성형 UI**: "로그인 페이지 만들어줘" → 완전한 UI 생성
- **토큰 효율**: 문서 자동 생성 금지, 요청 시만 업데이트

---

## 요구 사항

- Next.js 15+
- React 19+
- Tailwind CSS 4+
- shadcn/ui (new-york style)

---

## 설치

```bash
# 1. 스킬 폴더 복사
cp -r .claude/skills/ your_project/.claude/skills/

# 2. 핵심 설정 복사
cp claude.md your_project/
cp -r docs/ your_project/docs/
cp -r src/components/claude.md your_project/src/components/
cp -r src/lib/claude.md your_project/src/lib/
cp -r src/features/claude.md your_project/src/features/

# 3. PRD 커스터마이징
# your_project/docs/prd.md 수정

# 4. Primary Color 변경
# your_project/src/app/globals.css에서 --primary 값 변경
```

상세 설치 가이드: [INSTALL.md](.claude/skills/INSTALL.md)

---

## 스킬 구조

```
/.claude/skills/
├── flow-ui.md        # 메인 스킬 정의
├── manifest.json     # 메타데이터 + 워크플로우
└── INSTALL.md        # 설치 가이드

/claude.md            # 루트 헌법 (전역 원칙)

/docs/
├── prd.md            # PRD 템플릿
├── README.md         # SSOT 가이드
├── architecture/     # 시스템 개요
├── foundations/      # 전역 규칙 (naming, tokens, i18n, a11y)
├── checklists/       # 품질 검증 (button, modal, a11y)
├── workflow/         # 프로세스
└── changes/          # 변경 이력

/src/
├── components/claude.md  # 컴포넌트 가이드
├── lib/claude.md         # 백엔드/유틸 가이드
└── features/claude.md    # 기능 모듈 가이드
```

---

## 워크플로우

```
1. PRD 확인 → 프로젝트 컨텍스트 파악
2. 요청 분석 → 필요한 컴포넌트 식별
3. 설계 요약 (3~5줄) → 응답에 포함
4. 네이밍 부여 → ID 체계에 따라
5. 컴포넌트 조합 → 정의된 패턴 사용
6. i18n 적용 → text-config.ts 활용
7. 접근성 검증 → 체크리스트 확인
8. (선택) Feature Batch 완료 후 문서 요청 시만 업데이트
```

---

## 토큰 효율 원칙

```
✅ 기본 응답: 설계 요약 (3~5줄) + 코드
❌ 금지: 매 요청마다 문서 자동 생성
```

| 상황 | 문서 작업 |
|-----|----------|
| 코딩 요청 | ❌ 문서 작성 안함 |
| Feature Batch 완료 | ⏳ 사용자 요청 시만 |
| "문서 업데이트해줘" | ✅ 델타만 업데이트 |

---

## 버튼 규칙

| Variant | 용도 | 사용 빈도 |
|---------|------|----------|
| `default` | Primary 액션 (CTA) | ⭐⭐⭐ 기본 사용 |
| `outline` | Secondary 액션 | ⭐⭐⭐ 기본 사용 |
| `destructive` | 위험 액션 | 사용자 요청 시만 |
| `ghost` | 최소 강조 | 사용자 요청 시만 |

---

## 라이센스

MIT

---

## 변경 이력

| 날짜 | 버전 | 변경 내용 |
|-----|------|---------|
| 2025-12-05 | 1.0.0 | 초기 스킬 패키징 |
| 2025-12-05 | 2.0.0 | 토큰 효율 원칙 추가, PRD 템플릿 생성, 워크플로우 개선 |
