# UI_SYSTEM - UI 시스템 개요

> 전체 UI 시스템 연결 구조 및 핵심 규칙 요약

---

## 개요

디자인 토큰 → 컴포넌트 → i18n → 접근성의 연결 지도

---

<!-- FUNCTIONAL:BEGIN -->

### Contract: UI_SYSTEM_FUNC_TOKEN_FLOW

- **What**: Primary Color → globals.css → 컴포넌트 연결 흐름
- **Evidence**:
  - code: `src/app/globals.css`
  - code: `src/components/ui/button.tsx::buttonVariants`
  - code: `src/lib/utils.ts::cn`

### Contract: UI_SYSTEM_FUNC_TEXT_CONFIG

- **What**: 텍스트 설정 시스템 (i18n)
- **Evidence**:
  - code: `src/lib/text-config.ts::BUTTON_TEXT`
  - code: `src/lib/text-config.ts::isAppsInToss`

<!-- FUNCTIONAL:END -->

---

## 연결 구조

```
[PRD] ─→ Primary Color ─→ [globals.css]
                              ↓
[naming.md] ─→ ID 체계 ─→ [text-config.ts] ─→ [Components]
                              ↓
[semantic.md] ─→ Tone Code ─→ [i18n 텍스트]
                              ↓
[tokens.md] ─→ Design Token ─→ [CVA variants]
                              ↓
[a11y.md] ─→ 접근성 규칙 ─→ [aria-* 속성]
```

---

## 핵심 규칙 요약

| 영역 | 규칙 | 참조 |
|-----|------|------|
| **Color** | Primary만 변경 → 전역 반영 | `globals.css` |
| **Button** | default + outline (주사용) | `UI_COMPONENT.md` |
| **Naming** | `{TYPE}.{DOMAIN}.{CONTEXT}` | `FOUNDATION.md` |
| **i18n** | `getText(ID)` 사용, 하드코딩 금지 | `FOUNDATION.md` |
| **a11y** | WCAG AA, 키보드 접근, 포커스 트랩 | `FOUNDATION.md` |

---

## 주요 파일 위치

| 용도 | 파일 |
|-----|------|
| 디자인 토큰 | `/src/app/globals.css` |
| i18n 텍스트 | `/src/lib/text-config.ts` |
| UI 컴포넌트 | `/src/components/ui/` |
| 유틸리티 | `/src/lib/utils.ts` |

---

## 새 기능 추가 시

```
1. 설계 요약 (3~5줄)
2. 코드 구현
3. 체크리스트로 검증
4. (선택) 문서 요청 시만 업데이트
```

---

## 참조

- 원본: `docs/architecture/ui-system-overview.md`
- 관련: `FOUNDATION.md`, `UI_COMPONENT.md`

---

> **마이그레이션**: 2026-01-21 DocOps 자동 변환
