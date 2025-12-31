# 캐릭터 커스터마이징 설계서

> **최종 업데이트**: 2025-12-29
> **상위 문서**: [/docs/ROADMAP.md](../ROADMAP.md)
> **목표**: ZEP 상위호환 - 48×64 고해상도 + Layer Compositing

---

## 1. 현재 상태 (2025-12-29 업데이트)

### 1.1 스프라이트 시스템

| 항목 | 현재 값 | 위치 |
|-----|---------|------|
| 해상도 | 24×32 | `CharacterSprite.ts` |
| 프레임 수 | 4×4 (16프레임) | `MainScene.ts:130-140` |
| 색상 수 | 8개 | `public/assets/game/sprites/` |
| 방향 Row | down(0-3), left(4-7), right(8-11), up(12-15) | - |

### 1.2 동기화 상태 ✅ Phase 2 완료

| 항목 | 상태 | 위치 |
|-----|------|------|
| `PlayerPosition.avatarColor` | ✅ 포함 | `socket/types.ts` |
| `PlayerPosition.avatarConfig` | ✅ 포함 | `socket/types.ts` |
| `join:space` | ✅ avatarConfig 전송 | 입장 시 |
| `player:move` | ✅ **경량화됨** (avatar 제외) | `useSocket.ts`, `socket-server.ts` |
| `player:updateProfile` | ✅ avatarConfig 포함 | 프로필 변경 시 |
| `PlayerMoveData` | ✅ 신규 타입 | `socket/types.ts` |

### 1.3 영속화 상태 ✅ Phase 1 완료

| 모델 | 필드 | 상태 |
|-----|------|------|
| `User` | avatarConfig | ✅ `Json?` 타입 추가됨 |
| `GuestSession` | avatar | ⚠️ String만 (향후 확장) |

### 1.4 Zod 스키마 ✅ Phase 1 완료

| 파일 | 내용 |
|-----|------|
| `avatar/avatar.schema.ts` | `AvatarConfigSchema`, `DEFAULT_AVATAR_CONFIG`, 유틸리티 함수 |

---

## 2. 목표 아키텍처

### 2.1 해상도 업그레이드

```
현재: 24×32  →  1차 목표: 48×64 (2배)  →  향후: 64×96
```

**48×64 선택 근거**:
- 기존 충돌/타일/카메라 감각 유지
- 디테일 여유 크게 증가
- 파이프라인 안정화 후 확장 가능

### 2.2 Layer Compositing

**합성 레이어 순서**:
```
1. body (skinTone)
2. bottom
3. top
4. hair
5. accessory (옵션)
```

**디렉토리 구조**:
```
public/assets/game/character-parts/
├── body/          # body-light.png, body-medium.png, body-dark.png
├── hair/          # hair-basic-black.png, hair-short-brown.png, ...
├── top/           # top-tshirt-white.png, top-tshirt-navy.png, ...
├── bottom/        # bottom-pants-black.png, bottom-pants-blue.png, ...
├── shoes/         # shoes-sneakers-white.png (옵션)
└── accessory/     # accessory-glasses-black.png, accessory-hat-brown.png
```

---

## 3. 데이터 모델

### 3.1 Prisma 스키마

```prisma
model User {
  id           String   @id @default(cuid())
  name         String?
  email        String   @unique
  image        String?
  avatarConfig Json?    // ✅ 추가 필요
}
```

### 3.2 AvatarConfig 스키마 (Zod)

```typescript
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

  // 옵션
  shoesStyle: z.enum(["sneakers"]).optional(),
  shoesColor: z.enum(["white", "black"]).optional(),
  accessory: z.object({
    type: z.enum(["none", "glasses", "hat"]),
    color: z.enum(["black", "brown"]).optional(),
  }).optional(),

  // 렌더링/애니메이션
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

## 4. 소켓 동기화 설계

### 4.1 타입 확장

```typescript
// src/features/space/socket/types.ts
export interface PlayerPosition {
  id: string;
  x: number;
  y: number;
  direction: "up" | "down" | "left" | "right";
  isMoving: boolean;
  nickname: string;

  avatarColor?: AvatarColor;    // 기존 (호환용)
  avatarConfig?: AvatarConfig;  // ✅ 신규
}
```

### 4.2 최적화 (필수)

| 이벤트 | 현재 | 목표 |
|-------|------|------|
| `join:space` | avatarColor 포함 | avatarConfig 포함 |
| `player:move` | avatarColor 포함 | **제거** (경량화) |
| `player:updateProfile` | avatarColor 포함 | avatarConfig 포함 |

> 커스터마이징 payload는 커질 수 있으므로, 이동 패킷에서 제거 필수

---

## 5. 렌더링 구현

### 5.1 CHARACTER_CONFIG 업데이트

```typescript
// 현재
const CHARACTER_CONFIG = {
  WIDTH: 24,
  HEIGHT: 32,
  SCALE: 1.5,
};

// 목표 (Phase 3)
const CHARACTER_CONFIG = {
  WIDTH: 48,
  HEIGHT: 64,
  SCALE: 1.0, // 조정 필요
};
```

### 5.2 텍스처 키 전략

```typescript
function avatarKey(config: AvatarConfig) {
  const str = JSON.stringify(config);
  return `avatar-v${config.version}-${simpleHash(str)}`;
}
```

### 5.3 합성 텍스처 생성

**위치**: `src/features/space/game/sprites/CharacterSprite.ts`

**프로세스**:
1. body/bottom/top/hair/accessory 순서로 draw
2. 프레임별 합성
3. 텍스처 키로 캐싱
4. `textures.exists(key)` 확인 후 재사용

---

## 6. 구현 로드맵

### Phase 0: 불일치 정리 ✅ 완료 (2025-12-29)

- [x] AvatarColor 8개로 통일
  - `MainScene.ts` 로드 목록 (8개 - 기존 정상)
  - `socket/types.ts` AvatarColor 타입 → 8개로 확장
  - `page.tsx` VALID_AVATAR_COLORS → 8개로 확장
  - `GameCanvas.tsx` → socket/types.ts import 사용
  - `PhaserGame.tsx` → socket/types.ts import 사용

### Phase 1: DB/타입 ✅ 완료 (2025-12-29)

- [x] Prisma: `User.avatarConfig Json?` 추가 + migration
- [x] Zod: `AvatarConfigSchema` + `DEFAULT_AVATAR_CONFIG` 작성
- [x] `PlayerPosition.avatarConfig` 타입 추가

### Phase 2: 소켓 최적화 ✅ 완료 (2025-12-29)

- [x] `join:space`에 avatarConfig 포함
- [x] `player:updateProfile`에 avatarConfig 포함
- [x] **`player:move`에서 avatarColor/avatarConfig 제거**
  - `PlayerMoveData` 경량 타입 추가 (socket/types.ts)
  - 클라이언트 emit에서 avatar 정보 제외 (useSocket.ts)

### Phase 3: 에셋 (48×64)

- [ ] `character-parts/*` 디렉토리 생성
- [ ] 파츠 스프라이트시트 제작 (48×64, 4×4)
- [ ] `MainScene.ts` 파츠 로드 추가
- [ ] `CHARACTER_CONFIG` 업데이트
- [ ] 충돌박스/오프셋 조정

### Phase 4: 합성 렌더링

- [ ] `CharacterSprite.ts`에 합성 텍스처 생성 구현
- [ ] 텍스처 캐싱 (`textures.exists(key)`)
- [ ] `LOCAL_PROFILE_UPDATE` / `REMOTE_PROFILE_UPDATE` 처리

### Phase 5: 애니메이션 상향

- [ ] 1차: 48×64 + 4×4 (프레임 4) 안정화
- [ ] 2차: 8×4 (프레임 8) 확장
- [ ] `FRAME_COUNT` 레지스트리 기반 처리

### Phase 6: UI

- [ ] `CharacterCustomizer.tsx` 구현 (탭: 피부/헤어/상의/하의/악세서리)
- [ ] 실시간 미리보기
- [ ] 저장 버튼 → `updateProfile()` + API

### Phase 7: UX 확장

- [ ] 프리셋 룩 (미니멀/포멀/스트릿/겨울)
- [ ] 원클릭 코디 추천
- [ ] Outfit 저장 슬롯 (3개)

---

## 7. 성공 기준

### 필수 (기능/안정성)

- [ ] 입장 시 `User.avatarConfig` 기반 렌더링
- [ ] 변경 후 내 화면 즉시 반영
- [ ] 다른 유저에게 실시간 반영
- [ ] 재접속 시 동일 아바타 유지
- [ ] `player:move`에 avatar 정보 미포함 (트래픽 최적화)
- [ ] 동일 조합 텍스처 캐시 재사용

### 상위호환 (퀄리티)

- [ ] 48×64 적용 후 디테일/가독성 향상 명확
- [ ] 걷기/정지/방향 전환 자연스러움
- [ ] 8프레임 적용 후 부드러움 체감

### UX

- [ ] 프리셋/추천으로 빠른 룩 생성
- [ ] 30초 내 첫 결과물 생성 가능

---

## 변경 이력

| 날짜 | 버전 | 변경 |
|-----|------|------|
| 2025-12-29 | 1.3.0 | Section 1 "현재 상태" 실제 구현 반영으로 업데이트 |
| 2025-12-29 | 1.2.0 | Phase 2 완료 - player:move 경량화 (PlayerMoveData 타입) |
| 2025-12-29 | 1.1.0 | Phase 1 완료 - DB/타입 구현 (avatarConfig, Zod 스키마) |
| 2025-12-29 | 1.0.0 | 초기 생성 (GPT.md 정제) |
| 2025-12-26 | - | 원본 GPT.md 작성 |
