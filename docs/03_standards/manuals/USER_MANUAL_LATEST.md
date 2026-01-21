# 사용자 매뉴얼

> 자동 생성: specctl compile (2026-01-21 16:16:39)

---

## 목차
- [ADMIN](#ADMIN)
- [AI_PROTOCOL](#AI_PROTOCOL)
- [ARCH](#ARCH)
- [AUTH](#AUTH)
- [CRON](#CRON)
- [DASHBOARD](#DASHBOARD)
- [FOUNDATION](#FOUNDATION)
- [GUEST](#GUEST)
- [INFRA](#INFRA)
- [LIVEKIT](#LIVEKIT)
- [PERMISSION](#PERMISSION)
- [SPACE](#SPACE)
- [UI_COMPONENT](#UI_COMPONENT)
- [UI_SYSTEM](#UI_SYSTEM)
- [USER](#USER)

---

## ADMIN


---

## AI_PROTOCOL

### Contract: AI_PROTOCOL_DESIGN_TASK_STRUCTURE
- **Tier**: normal
- **What**: TASK.md 臾몄꽌 援ъ“ ?쒗뵆由?
- **Template**:
  ```markdown
  # TASK: [?쒖뒪???쒕ぉ]

  > **紐⑺몴**: [??以??ㅻ챸]
  > **?쒖옉??*: YYYY-MM-DD

  ## ?꾩옱 ?곹깭
  | ?곹깭 | ?섎웾 | ?ㅻ챸 |

  ## Phase 1: [?④퀎紐?
  - [ ] 泥댄겕由ъ뒪????ぉ

  ## 吏꾪뻾 ?곹깭
  | Phase | ?ㅻ챸 | ?곹깭 | ?꾨즺??|

  ## 李몄“
  - HANDOFF: docs/00_ssot/HANDOFF_*.md

  ## 蹂寃??대젰
  | ?좎쭨 | 蹂寃??댁슜 |
  ```
- **Evidence**:
  - code: `TASK.md::TASK`

### Contract: AI_PROTOCOL_DESIGN_HANDOFF_STRUCTURE
- **Tier**: normal
- **What**: HANDOFF 臾몄꽌 援ъ“ (?몄뀡 媛?而⑦뀓?ㅽ듃 ?꾨떖)
- **Template**:
  ```markdown
  # HANDOFF - [?묒뾽紐?

  > **?몄뀡 ?몃뱶?ㅽ봽 臾몄꽌**
  > **?묒꽦??*: YYYY-MM-DD
  > **?곹깭**: ??吏꾪뻾以?| ???꾨즺

  ## 1. 諛곌꼍
  ## 2. ?꾨즺???묒뾽
  ## 3. ?ㅼ쓬 ?묒뾽
  ## 4. ?뚯씪 ?꾩튂 ?붿빟
  ```
- **Evidence**:
  - code: `docs/00_ssot/HANDOFF_2026-01-21_CLAUDE_SLIM.md`

---

## ARCH


---

## AUTH


---

## CRON


---

## DASHBOARD


---

## FOUNDATION

### Contract: FOUNDATION_DESIGN_A11Y_MODAL

- **Tier**: core
- **What**: 紐⑤떖 ?묎렐???꾩닔 ?붽뎄?ы빆 ?곸꽭
- **Requirements**:
  | ?붽뎄?ы빆 | 援ы쁽 諛⑸쾿 |
  |---------|----------|
  | ?대┫ ???ъ빱???대룞 | 紐⑤떖 ?대? 泥?踰덉㎏ ?ъ빱???붿냼濡?|
  | ?ъ빱???몃옪 | Tab ?ㅻ줈 紐⑤떖 ?대?留??쒗솚 |
  | ESC ?リ린 | ?ㅻ낫???몃뱾???깅줉 |
  | ?ロ옄 ???ъ빱??蹂듦? | ?몃━嫄??붿냼濡?蹂듦? |
  | ??븷 ?좎뼵 | `role="dialog"` + `aria-modal="true"` |
  | ?덉씠釉?| `aria-labelledby` ?먮뒗 `aria-label` ?꾩닔 |
- **Evidence**:
  - ui: `src/components/ui/dialog.tsx::DialogContent`
  - code: `src/components/ui/dialog.tsx::Dialog`

### Contract: FOUNDATION_DESIGN_STATE_MACHINE

- **Tier**: normal
- **What**: 紐⑤떖 ?곹깭???묒꽦 洹쒖튃 (State Machine)
- **States**: `[CLOSED, OPENING, OPEN, CLOSING]`
- **Events**:
  | ?대깽??| ?ㅻ챸 |
  |-------|------|
  | OPEN_MODAL | 紐⑤떖 ?닿린 ?붿껌 |
  | CLOSE_MODAL | 紐⑤떖 ?リ린 ?붿껌 |
  | ANIMATION_END | ?좊땲硫붿씠???꾨즺 |
- **Guards**:
  | Guard | 議곌굔 |
  |-------|------|
  | canOpen | `currentState === CLOSED` |
  | canClose | `currentState === OPEN` |
- **Transitions**:
  ```
  CLOSED ??OPENING: Event=OPEN_MODAL, Guard=canOpen
  OPENING ??OPEN: Event=ANIMATION_END
  OPEN ??CLOSING: Event=CLOSE_MODAL, Guard=canClose
  CLOSING ??CLOSED: Event=ANIMATION_END
  ```
- **Evidence**:
  - code: `src/components/ui/dialog.tsx::Dialog`
  - code: `src/components/ui/dialog.tsx::DialogContent`

---

## GUEST


---

## INFRA


---

## LIVEKIT


---

## PERMISSION


---

## SPACE


---

## UI_COMPONENT

### Contract: UI_COMPONENT_DESIGN_BUTTON

- **What**: 踰꾪듉 ?쒓컖 ?붿옄??諛??곹샇?묒슜 ?곹깭
- **Evidence**:
  - code: `src/components/ui/button.tsx::variant`
  - code: `src/components/ui/button.tsx::size`

### Contract: UI_COMPONENT_DESIGN_MODAL

- **What**: 紐⑤떖 ?ㅻ쾭?덉씠 諛??좊땲硫붿씠??
- **Evidence**:
  - code: `src/components/ui/dialog.tsx::DialogOverlay`
  - code: `src/components/ui/dialog.tsx::DialogContent`

### Contract: UI_COMPONENT_DESIGN_BUTTON_HOVER

- **Tier**: core
- **What**: 踰꾪듉 Hover ?ㅽ???洹쒖튃 (variant蹂??곹샇?묒슜)
- **Rules**:
  | Variant | Hover ???ㅽ???|
  |---------|----------------|
  | `default` | 諛곌꼍 ?대몼寃?(primary/90), 洹몃┝??+ ?곸듅 ?④낵 |
  | `outline` | **?뚮몢由???primary, ?띿뒪????primary, 諛곌꼍 ???щ챸 ?좎?** |
  | `destructive` | 諛곌꼍 ?대몼寃?(destructive/90), 洹몃┝??+ ?곸듅 ?④낵 |
  | `ghost` | 諛곌꼍 accent ?곸슜 |
- **Critical**: outline 踰꾪듉 hover ??**諛곌꼍??蹂寃?湲덉?**, ?뚮몢由ъ? ?띿뒪?몃쭔 primary濡?蹂寃?
- **Evidence**:
  - code: `src/components/ui/button.tsx::buttonVariants`
  - code: `src/app/globals.css`

---

## UI_SYSTEM


---

## USER


---


---

> **자동 생성**: 2026-01-21 16:16:39
