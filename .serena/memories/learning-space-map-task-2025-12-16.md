# Learning Space Map Implementation Task

## Overview
- **Task**: 50명 수용 학습 공간 맵 구현
- **Started**: 2025-12-16
- **Status**: In Progress

## Requirements
1. Large Lecture Hall (50 seats) - Theater-style seating
2. 3 Classrooms (10-15 people each) - Group desk arrangement
3. 4 Mentoring Rooms (4-6 people each) - Small meeting setup
4. Corridors/Lobby - Connecting spaces

## Technical Specs
- Map Size: 80x60 tiles (2560x1920px)
- Tile Size: 32x32px
- New Tiles: Lecture seats, podium, blackboard, student desks

## Files to Modify
- `src/features/space/game/tiles/TilesetGenerator.ts` - Add learning space tiles
- `src/features/space/game/tiles/MapData.ts` - New 80x60 map layout
- `src/features/space/game/tiles/TileSystem.ts` - If needed

## Layout Design
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              ENTRANCE / LOBBY                                │
├───────────────────────┬────────────────────────────┬───────────────────────┤
│                       │                            │  Mentoring 1-4        │
│    LECTURE HALL       │      CLASSROOMS 1-3        │  (small meeting)      │
│    (50 seats)         │      (group desks)         │                       │
│                       │                            │                       │
│  [STAGE/SCREEN]       │                            │                       │
├───────────────────────┴────────────────────────────┴───────────────────────┤
│                              CORRIDOR                                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Phase Progress
- [ ] Phase 1: Tileset Extension
- [ ] Phase 2: Map Config Update
- [ ] Phase 3: Layer Data Implementation
- [ ] Phase 4: Spawn Points & Interactive Zones
- [ ] Phase 5: Testing & Validation

## Reference
- ZEP-style learning space design
- Modern office color palette
