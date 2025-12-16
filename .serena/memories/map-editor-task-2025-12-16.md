# 맵 에디터 시스템 구현 태스크

## 개요
- **시작일**: 2025-12-16
- **상태**: 진행 중
- **핵심**: 채팅 명령어 기반 인게임 맵 에디터

## 설계 원칙
1. **하드코딩 금지** - 모든 데이터는 설정 파일/DB에서 동적 로드
2. **기존 시스템 확장** - chatParser.ts의 @명령어 시스템 확장
3. **권한 체계** - Staff 이상만 사용 가능

## 명령어 체계 (3단계)

### 기본 명령어 (Phase 1)
- @편집기 / @editor - 에디터 패널 토글
- @생성 <이름> / @create / @spawn - 캐릭터 앞에 배치
- @삭제 / @delete / @remove - 캐릭터 앞 오브젝트 삭제
- @목록 / @list - 배치 가능 에셋 목록

### 확장 명령어 (Phase 2)
- @회전 / @rotate - 90° 회전
- @취소 / @undo - 마지막 작업 취소
- @목록 <카테고리> - 특정 카테고리만
- @검색 <키워드> / @search - 에셋 검색

### 고급 명령어 (Phase 3)
- @생성 <이름> <x>,<y> - 좌표 지정 배치
- @복사 / @copy - 오브젝트 복사
- @붙여넣기 / @paste - 복사본 배치
- @선택 반경 <n> - 범위 선택
- @수정 <ID> / @edit - 속성 수정

## 설정 파일 구조
- /src/config/editor-commands.ts - 명령어 레지스트리
- /src/config/asset-registry.ts - 에셋 메타데이터
- /src/config/asset-categories.ts - 카테고리 설정
- /src/config/editor-config.ts - 전역 설정

## 페어 오브젝트 (포털)
- AssetMetadata.requiresPair로 페어 필요 여부 정의
- 상태 머신: IDLE → PLACING_1ST → PLACING_2ND → COMPLETE
- ESC로 취소 시 롤백

## UX 설계
- ESC 키: 페어 취소 → 에디터 닫기 (우선순위)
- 종료 버튼: 에디터 패널 우상단 [X]
- 캐릭터 방향 기반 배치 (playerDirection 활용)

## 관련 파일
- chatParser.ts - 기존 명령어 파서
- MainScene.ts - Phaser 게임 씬 (playerDirection 존재)
- InteractiveObject.ts - 기존 포털 구현 참조

## 참조 메모리
- navigation-structure-2025-12-15 - 역할별 권한 구조
