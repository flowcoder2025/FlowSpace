# FlowSpace 2D 사람 캐릭터 커스터마이징 최종안 (ZEP 상위호환 목표)

- 작성일: 2025-12-26
- 목표: **2D 기반으로 ZEP 상위호환(그래픽/애니메이션 우선, UX도 함께 강화)**
- 저장 기준: **계정(User) 기본 아바타로 저장**
- DB: PostgreSQL + Prisma (**Json/JSONB 네이티브 지원**)
- 엔진: Phaser 3

---

## 1) 현재 상태 요약 (코드 기반 사실)

### 1.1 현재 캐릭터 스프라이트시트

- 로드: `src/features/space/game/scenes/MainScene.ts:130-140`
- 규격: `24×32`, 4×4(총 16프레임)
- 방향 Row:
  - down: 0\~3
  - left: 4\~7
  - right: 8\~11
  - up: 12\~15
- 애니메이션 키: `{color}-{idle|walk}-{direction}`

### 1.2 멀티 동기화

- `PlayerPosition.avatarColor?` 포함 (`src/features/space/socket/types.ts`)
- 전송:
  - `join:space`(입장) 포함
  - `player:move`(이동)에서 **매 이동마다 포함**
  - `player:updateProfile`로 실시간 변경

### 1.3 저장(영속화)

- `User`에는 avatarColor/config 없음 → **영속화 불가**
- `GuestSession`에는 `avatar String`만 존재

---

## 2) 이번 최종 결정 (사용자 확정)

### 2.1 해상도 업그레이드

- **현행 24×32 → 고해상도 업그레이드**
- 권장 1차 타깃: **48×64** (2배)
  - 이유: 기존 충돌/타일/카메라 감각 유지가 쉬우면서 디테일 여유가 크게 늘어남

> 64×96도 가능하지만(더 고퀄), 먼저 48×64로 올려서 파이프라인/합성/동기화까지 안정화하는 것을 권장.

### 2.2 상위호환 우선순위

1. **그래픽/애니메이션 퀄리티(최우선)**
2. UX(프리셋/추천/저장 등)도 함께 강화

---

## 3) 먼저 해결해야 하는 불일치 (필수)

### 3.1 AvatarColor 타입/검증/로드 불일치

- `MainScene.ts` 로드: 8개(`default, red, green, purple, orange, pink, yellow, blue`)
- 타입/검증: 6개(`default, red, green, purple, orange, pink`)

**최종 선택(권장): 8개를 공식으로 통일**

- 변경 대상:
  - `src/features/space/socket/types.ts`의 `AvatarColor`
  - `src/app/space/[id]/page.tsx`의 `VALID_AVATAR_COLORS`

---

## 4) 목표 아키텍처 개요

### 4.1 커스터마이징 방식

**Layer Compositing (런타임 합성) + 텍스처 캐싱**

- 파츠(body/hair/top/bottom/shoes/accessory)를 같은 레이아웃 규칙으로 준비
- Canvas(Texture)로 프레임별 합성하여 최종 텍스처 생성

#### 합성 레이어 순서(권장)

1. body (skinTone)
2. bottom
3. top
4. hair
5. accessory (옵션)

### 4.2 저장 기준

- **User.avatarConfig (Json?)** 에 영속화
- 공간 입장 시: User.avatarConfig를 기본값으로 사용
- 변경 시: 소켓 실시간 반영 + DB 업데이트

---

## 5) 데이터 모델 (Prisma)

### 5.1 Prisma 스키마 변경

```prisma
model User {
  id           String   @id @default(cuid())
  name         String?
  email        String   @unique
  image        String?

  // ✅ 추가
  avatarConfig Json?
}
```

> 게스트도 사람 커스터마이징이 필요하면 `GuestSession`에도 `avatarConfig Json?`를 추가(옵션).

### 5.2 AvatarConfig (Zod 런타임 검증)

Prisma Json은 TypeScript에서 `unknown`으로 추론되므로 런타임 검증이 필수.

```ts
// src/features/space/avatar/avatar.schema.ts
import { z } from "zod";

export const AvatarConfigSchema = z.object({
  version: z.literal(1),

  // 외형
  skinTone: z.enum(["light", "medium", "dark"]),

  hairStyle: z.enum(["basic", "short", "long"]),
  hairColor: z.enum(["black", "brown", "blonde"]),

  topStyle: z.enum(["tshirt"]),
  topColor: z.enum(["white", "navy", "red"]),

  bottomStyle: z.enum(["pants"]),
  bottomColor: z.enum(["black", "blue"]),

  shoesStyle: z.enum(["sneakers"]).optional(),
  shoesColor: z.enum(["white", "black"]).optional(),

  accessory: z
    .object({
      type: z.enum(["none", "glasses", "hat"]),
      color: z.enum(["black", "brown"]).optional(),
    })
    .optional(),

  // 렌더링/애니메이션 옵션(확장용)
  animPreset: z.enum(["classic", "smooth"]).optional(),
});

export type AvatarConfig = z.infer<typeof AvatarConfigSchema>;

export const DEFAULT_AVATAR_CONFIG: AvatarConfig = {
  version: 1,
  skinTone: "medium",
  hairStyle: "basic",
  hairColor: "black",
  topStyle: "tshirt",
  topColor: "navy",
  bottomStyle: "pants",
  bottomColor: "black",
};
```

---

## 6) 소켓/동기화 스펙 (avatarColor → avatarConfig)

### 6.1 타입 확장

```ts
// src/features/space/socket/types.ts
export interface PlayerPosition {
  id: string;
  x: number;
  y: number;
  direction: "up" | "down" | "left" | "right";
  isMoving: boolean;
  nickname: string;

  // 기존(호환용, 단계적 제거)
  avatarColor?: AvatarColor;

  // ✅ 신규
  avatarConfig?: AvatarConfig;
}
```

### 6.2 이벤트 payload

- `join:space`: `avatarConfig` 포함
- `player:updateProfile`: `avatarConfig` 포함
- `player:profileUpdated`: `avatarConfig` 포함

### 6.3 성능 최적화 (필수 권장)

- **player\:move\*\*\*\*에서 avatarColor/avatarConfig 제거**
- 프로필 변경은 `player:updateProfile`로만 전파

> 커스터마이징 payload는 커질 수 있으므로, 이동 패킷에 포함되면 비용/지연 리스크가 증가.

---

## 7) 에셋 파이프라인 (고해상도 + 상위호환 퀄리티)

### 7.1 1차 규격(권장) — 48×64 / 4×4(16프레임)

- 1차 목표: 고해상도(디테일 향상) + 기존 애니메이션 구조 유지(리스크 최소화)
- 규칙:
  - frame: **48×64**
  - grid: **4×4**
  - row: down/left/right/up

### 7.2 2차 규격(확장) — 48×64 / 8×4(32프레임) (애니메이션 상향)

- 상위호환 체감 강화를 위해 **walk 프레임 수 8로 확장**
- 규칙:
  - frame: **48×64**
  - grid: **8×4**
  - row: down/left/right/up

> 1차(4프레임)로 파이프라인을 안정화한 뒤, 2차에서 8프레임으로 업그레이드하는 단계 전략.

### 7.3 디렉토리 구조(권장)

```
public/assets/game/character-parts/
  body/
    body-light.png
    body-medium.png
    body-dark.png

  hair/
    hair-basic-black.png
    hair-basic-brown.png
    hair-basic-blonde.png
    hair-short-black.png
    ...

  top/
    top-tshirt-white.png
    top-tshirt-navy.png
    top-tshirt-red.png

  bottom/
    bottom-pants-black.png
    bottom-pants-blue.png

  shoes/
    shoes-sneakers-white.png
    shoes-sneakers-black.png

  accessory/
    accessory-glasses-black.png
    accessory-hat-brown.png
```

---

## 8) 렌더링 구현 (Phaser)

### 8.1 CHARACTER\_CONFIG (업그레이드)

현행(코드 사실): 24×32, SCALE 1.5

고해상도 전환(권장 1차):

- WIDTH: 48
- HEIGHT: 64
- SCALE: 1.0\~1.2 범위에서 조정(프로젝트 화면 구성에 맞춰 튜닝)

> SCALE/충돌 박스/오프셋은 기존 값의 “비율”을 유지하도록 조정한 뒤, 실제 플레이로 튜닝.

### 8.2 텍스처 키 전략(캐싱)

- `avatarConfig`로부터 안정적인 키 생성

```ts
function avatarKey(config: AvatarConfig) {
  const str = JSON.stringify(config);
  return `avatar-v${config.version}-${simpleHash(str)}`;
}
```

### 8.3 합성 텍스처 생성

- 위치: `src/features/space/game/sprites/CharacterSprite.ts`
- 기존 `generateCharacterTexture()` 흐름을 확장하거나 별도 함수 추가
- 프레임별로 body/bottom/top/hair/accessory draw

**상위호환 퀄리티 옵션(권장, 단계적 적용)**

- (A) 파츠를 `색 레이어`와 `라인/그림자 레이어`로 분리 → 염색/명암 유지
- (B) 팔레트 스왑(Shader/Pipeline) 도입 → 색상 변형을 “고급스럽게” 구현

### 8.4 프로필 변경 이벤트 처리

- `useSocket.ts updateProfile()` → `GameEvents.LOCAL_PROFILE_UPDATE/REMOTE_PROFILE_UPDATE`
- 이벤트 수신 시:
  - 새 텍스처 키 생성
  - 없으면 합성 생성
  - 스프라이트 textureKey 교체 + 애니메이션 재바인딩

---

## 9) 애니메이션 상위호환 로드맵 (그래픽/애니 최우선)

### Phase A (필수) — 고해상도 + 4프레임 유지

- 목적: 파이프라인 안정화 + 즉시 퀄리티 향상
- 작업:
  - 48×64 파츠/바디 제작
  - 합성 텍스처 생성/캐시 적용

### Phase B (권장) — 8프레임 걷기(8×4)로 확장

- 목적: “상위호환” 체감 강화
- 작업:
  - `FRAME_COUNT`를 파츠 레지스트리에서 읽도록 확장
  - `createCharacterAnimationsFromSpritesheet()`가 frameCount(4/8)를 지원하도록 변경

### Phase C (선택) — Idle 미세 모션 + 감정(표정 레이어)

- 목적: 2D임에도 생동감/고급감 극대화
- 작업:
  - idle에 숨쉬기/미세 흔들림
  - eyes/face 레이어를 최소 개수로 추가(예: neutral/smile/surprised)

---

## 10) DB 저장/로드 흐름 (User 기준)

### 10.1 로그인 사용자

- 진입 시: `User.avatarConfig` 로드
  - 없으면 `DEFAULT_AVATAR_CONFIG`
- 저장 시:
  - `player:updateProfile`(실시간 반영)
  - API로 `User.avatarConfig` 업데이트(영속화)

### 10.2 게스트(옵션)

- 선택지:
  - (A) 게스트는 기존 avatarColor만 유지
  - (B) 게스트도 `GuestSession.avatarConfig Json?` 저장

---

## 11) UI/UX (상위호환 2순위)

### 11.1 MVP UI

- “캐릭터 꾸미기” 모달
- 탭: 피부/헤어/상의/하의/악세서리
- 실시간 미리보기 + 저장

### 11.2 상위호환 UX 장치

- 프리셋(룩): 미니멀/포멀/스트릿/겨울
- 원클릭 코디 추천
- Outfit 저장 슬롯(예: 3개)

---

## 12) 구현 순서 체크리스트 (실행 가능한 버전 · 전체)

### Phase 0 — 불일치 정리

- **AvatarColor 8개로 타입/검증/로드 통일**
  - `src/features/space/game/scenes/MainScene.ts` 로드 목록(8개)과
  - `src/features/space/socket/types.ts`의 `AvatarColor`와
  - `src/app/space/[id]/page.tsx`의 `VALID_AVATAR_COLORS`
  - **3군데가 완전히 동일**해야 함

### Phase 1 — DB/타입

- Prisma: `User.avatarConfig Json?` 추가 + migration
- Zod: `AvatarConfigSchema` + `DEFAULT_AVATAR_CONFIG` 작성
- `src/features/space/socket/types.ts`
  - `AvatarConfig` 타입 정의
  - `PlayerPosition.avatarConfig?: AvatarConfig` 추가

### Phase 2 — 소켓 최적화(중요)

- `join:space` payload에 `avatarConfig` 포함
- `player:updateProfile` payload에 `avatarConfig` 포함
- `player:profileUpdated` payload에 `avatarConfig` 포함
- ``**에서 avatarColor/avatarConfig 제거**
  - 커스터마이징은 “프로필 업데이트 이벤트”로만 전파 (이동 패킷 경량화)

### Phase 3 — 고해상도 에셋 파이프라인(48×64)

- `public/assets/game/character-parts/*` 디렉토리 생성
- 파츠 스프라이트시트 제작/추가(48×64, 4×4)
  - body / hair / top / bottom / (optional shoes/accessory)
- `MainScene.ts`에서 파츠 spritesheet `load.spritesheet()` 추가
- `CHARACTER_CONFIG.WIDTH/HEIGHT`를 48×64로 업데이트
- 충돌박스/오프셋을 “비율 유지”로 1차 조정 후, 플레이 테스트로 미세 튜닝

### Phase 4 — 합성 렌더링(캐싱 포함)

- `CharacterSprite.ts`에 **avatarConfig 기반 합성 텍스처 생성** 구현
  - 레이어 순서: body → bottom → top → hair → accessory
- 텍스처 키: `avatarKey(hash(avatarConfig))`로 고정
- 캐싱: `textures.exists(key)`면 재생성하지 않음
- `LOCAL_PROFILE_UPDATE / REMOTE_PROFILE_UPDATE` 수신 시
  - 새 텍스처 생성(없으면) → 스프라이트 texture 교체 → 애니메이션 재바인딩

### Phase 5 — 애니메이션 상향(상위호환 체감)

- 1차(안정화): 48×64 + 4×4(프레임 4) 유지로 파이프라인 완성
- 2차(퀄리티 업): **8프레임 걷기(8×4) 확장**
  - 파츠 에셋을 8×4로 제작
  - `FRAME_COUNT`를 파츠/레지스트리 기반으로 4/8 모두 지원하도록 확장
  - `createCharacterAnimationsFromSpritesheet()`가 frameCount 인자를 받아 처리하도록 변경

### Phase 6 — UI(커스터마이저)

- `CharacterCustomizer.tsx` 구현(탭: 피부/헤어/상의/하의/악세서리)
- 실시간 미리보기(로컬 합성 텍스처)
- 저장 버튼 클릭 시
  - `useSocket.updateProfile({ avatarConfig })` 호출(실시간 반영)
  - API로 `User.avatarConfig` 업데이트(영속화)

### Phase 7 — 상위호환 UX(추가)

- 프리셋 룩(예: 미니멀/포멀/스트릿/겨울)
- 원클릭 코디 추천(자동 조합)
- Outfit 저장 슬롯(예: 3개)

---

## 13) 완료(성공) 기준 (Acceptance Criteria)

### 필수(기능/안정성)

- 입장 시 **User.avatarConfig** 기반 캐릭터로 렌더링된다.
- 커스터마이징 변경 후 **내 화면에 즉시 반영**된다.
- 변경 사항이 **다른 유저에게 실시간 반영**된다.
- 재접속/새 세션에서도 동일 아바타가 유지된다(**User.avatarConfig 영속화**).
- `player:move`에 avatar 정보가 포함되지 않아 **이동 트래픽이 증가하지 않는다**.
- 동일 조합은 텍스처 캐시 재사용으로 **재생성되지 않는다**(`textures.exists(key)` 기반).

### 상위호환(퀄리티)

- (그래픽) 48×64 적용 후 기존 대비 **디테일/가독성 향상**이 명확하다.
- (애니메이션) 걷기/정지/방향 전환이 자연스럽고 어색한 끊김이 없다.
- (확장 시) 8프레임(8×4) 적용 후 **부드러움 체감**이 분명하다.

### 상위호환(UX)

- 프리셋/추천/저장 슬롯으로 사용자가 빠르게 “괜찮은 룩”을 만들 수 있다.
- 커스터마이징 UI에서 **30초 내 첫 결과물**을 만들 수 있을 정도로 직관적이다.
