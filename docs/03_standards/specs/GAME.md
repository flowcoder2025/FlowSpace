# GAME - Phaser 게임 엔진 스펙

> Phaser 3 기반 2D 메타버스 게임 엔진 규격

---

## 개요

React 래핑된 Phaser 게임 엔진 - 타일맵, 캐릭터, 이벤트 브릿지

---

<!-- FUNCTIONAL:BEGIN -->

### Contract: GAME_FUNC_PHASER_WRAPPER

- **What**: PhaserGame React 래퍼
- **Rules**:
  - `useEffect` 클린업에서 `game.destroy()` 필수
  - React Strict Mode 대응 (이중 마운트 처리)
  - Phaser 인스턴스를 React 컴포넌트로 래핑
- **Evidence**:
  - code: `src/features/space/game/PhaserGame.tsx`
  - code: `src/features/space/game/config.ts`

### Contract: GAME_FUNC_MAIN_SCENE

- **What**: MainScene (타일맵, 캐릭터, 카메라)
- **Rules**:
  - 타일맵 로드 및 렌더링
  - 캐릭터 생성 및 이동
  - 카메라 추적
  - 상호작용 오브젝트 관리
- **Evidence**:
  - code: `src/features/space/game/scenes/MainScene.ts`

### Contract: GAME_FUNC_EVENT_BRIDGE

- **What**: Phaser ↔ React 이벤트 브릿지
- **Rules**:
  ```typescript
  // React → Phaser 이벤트 전달
  eventBridge.emit(GameEvents.PLAYER_MOVE, position)

  // React에서 게임 이벤트 수신
  eventBridge.on(GameEvents.PLAYER_MOVED, callback)

  // 채팅 포커스 이벤트
  eventBridge.emit(CHAT_FOCUS_CHANGED, isFocused)
  ```
- **Evidence**:
  - code: `src/features/space/game/events.ts`

### Contract: GAME_FUNC_CHARACTER

- **What**: CharacterSprite 캐릭터 스프라이트
- **Rules**:
  - 아바타 색상별 텍스처 (`character-{color}`)
  - 이동 애니메이션
  - 충돌 처리
- **Evidence**:
  - code: `src/features/space/game/sprites/CharacterSprite.ts`

### Contract: GAME_FUNC_TILES

- **What**: TileSystem 타일맵 렌더링
- **Rules**:
  - Tiled 맵 에디터 JSON 호환
  - 레이어별 렌더링
  - 충돌 레이어 처리
- **Evidence**:
  - code: `src/features/space/game/tiles/TileSystem.ts`

### Contract: GAME_FUNC_OBJECTS

- **What**: InteractiveObject 상호작용 오브젝트
- **Rules**:
  - E 키로 상호작용
  - 오브젝트 타입별 동작 정의
  - 근접 감지
- **Evidence**:
  - code: `src/features/space/game/objects/InteractiveObject.ts`

<!-- FUNCTIONAL:END -->

---

## 디렉토리 구조

```
/src/features/space/game
├── PhaserGame.tsx     # Phaser 인스턴스 React 래퍼
├── config.ts          # Phaser 설정
├── events.ts          # 게임-React 이벤트 브릿지
├── /scenes
│   └── MainScene.ts   # 메인 게임 씬
├── /sprites
│   └── CharacterSprite.ts  # 캐릭터 스프라이트
├── /tiles
│   └── TileSystem.ts       # 타일맵 렌더링
├── /objects
│   └── InteractiveObject.ts # 상호작용 오브젝트
└── index.ts
```

---

## 입력 컨트롤

| 키 | 동작 |
|---|------|
| WASD / 방향키 | 이동 |
| Space | 점프 |
| E | 상호작용 |
| Enter | 채팅 모드 전환 |
| ESC | 채팅 모드 해제 |

---

## 아바타 색상

| 색상 | 텍스처 키 |
|------|----------|
| default | `character-default` |
| red | `character-red` |
| green | `character-green` |
| purple | `character-purple` |
| orange | `character-orange` |
| pink | `character-pink` |

---

## 규칙

### 필수

```tsx
// eventBridge를 통한 통신
eventBridge.emit(GameEvents.PLAYER_MOVE, position)
```

### 금지

```tsx
// 게임 상태 직접 조작 금지
game.scene.scenes[0].player.x = 100  // 금지
```

---

## 참조

- 래퍼: `src/features/space/components/game/GameCanvas.tsx`
- 훅: `src/features/space/hooks/useChatMode.ts`

---

> **생성일**: 2026-01-21 DocOps SPEC 통합
