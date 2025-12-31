# TASK: 볼륨 조절 기능 개선

> **시작일**: 2025-12-31
> **이전 태스크**: 반응형 디자인 ✅ 완료
> **근거**: 사용자 피드백 - 볼륨 조절 UI/UX 문제

---

## 1. 이슈 목록

| # | 이슈 | 원인 | 상태 |
|:-:|------|------|:----:|
| 1 | 볼륨 조절이 실제 오디오에 적용 안됨 | 오디오 트랙 연결 후 볼륨 미적용 | ✅ |
| 2 | 볼륨바 조절 시 사라짐 | hover 범위가 버튼에만 한정 | ✅ |
| 3 | 작은 타일에서 볼륨바 잘림 | overflow-hidden + right-full | ✅ |

---

## 2. Phase 1: 볼륨 적용 로직 수정

### 2.1 문제 분석
```tsx
// 현재: useEffect에서 volume만 설정
useEffect(() => {
  const audio = audioRef.current
  if (!audio || isLocal) return
  audio.volume = isMuted ? 0 : volume
}, [volume, isMuted, isLocal])

// 문제: 오디오 트랙 연결 useEffect에서 볼륨 미적용
// - 트랙 연결 시 audio.volume이 기본값(1)으로 초기화됨
```

### 2.2 해결책
- 오디오 트랙 연결 후에도 저장된 볼륨 적용
- tryPlayAudio 성공 후 볼륨 설정 추가

---

## 3. Phase 2: 볼륨바 UI 개선

### 3.1 문제 분석
```tsx
// 현재: group-hover로 버튼 hover 시에만 표시
<div className="group/volume ...">
  <button>...</button>  // hover 대상
  <div className="hidden group-hover/volume:flex">  // 슬라이더
    // 버튼에서 슬라이더로 이동 시 hover 범위 벗어남
  </div>
</div>
```

### 3.2 해결책
- 상태 기반으로 슬라이더 표시 (useState + 지연 닫힘)
- 또는 슬라이더가 버튼과 이어져 hover 유지되도록 레이아웃 변경

---

## 4. Phase 3: 볼륨바 위치/오버플로우 개선

### 4.1 문제 분석
```tsx
// 현재: 왼쪽으로 확장 (right-full)
<div className="absolute right-full mr-1 ...">

// 문제: 컨테이너 overflow-hidden으로 잘림
className={cn(
  "group relative aspect-video rounded-lg bg-black",
  !isFullscreen && "overflow-hidden",  // 🔴 원인
)}
```

### 4.2 해결책
- 볼륨바를 아래쪽으로 확장 (top-full)
- 또는 볼륨 컨트롤 영역만 overflow-visible 처리

---

## 5. 변경 대상 파일

```
src/features/space/components/video/VideoTile.tsx
├── Phase 1: 볼륨 적용 로직 수정
├── Phase 2: 볼륨바 표시 방식 개선
└── Phase 3: 볼륨바 위치/레이아웃 변경

src/features/space/components/video/ScreenShare.tsx
├── 동일한 문제 수정 적용
└── 화면공유 오디오 볼륨 적용
```

---

## 6. 검증 항목

- [x] 볼륨 슬라이더 조작 시 실제 오디오 볼륨 변경 확인
- [x] 볼륨 설정이 새로고침 후에도 유지됨 (localStorage)
- [x] 볼륨바 조절 중 사라지지 않음
- [x] 작은 타일에서 볼륨바가 완전히 표시됨
- [x] TypeScript 컴파일 에러 없음
- [x] `npm run build` 성공

---

## 변경 이력

| 날짜 | 버전 | 변경 |
|-----|------|------|
| 2025-12-31 | 1.0.0 | 볼륨 조절 기능 개선 태스크 생성 |
| 2025-12-31 | 1.1.0 | ✅ 모든 Phase 완료 - 볼륨 적용 로직/UI/오버플로우 수정 |
