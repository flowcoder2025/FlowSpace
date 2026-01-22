# 캐릭터 에셋 파이프라인 가이드

> **목적**: Nanobanana3 AI로 캐릭터 스프라이트 생성 → JPEG→PNG 변환 → Phaser 3 적용

---

## 1. Nanobanana3 프롬프트 가이드

### 1.1 기본 템플릿

```
pixel art character sprite sheet, 4x4 grid, 192x256 pixels total,
48x64 pixels per frame, top-down RPG style,
solid magenta background #FF00FF,
4 directions (down, left, right, up) x 4 animation frames,
[캐릭터 설명], chibi proportions, clean pixel edges,
no anti-aliasing, 16-bit retro game style
```

### 1.2 스프라이트시트 구조

```
┌──────┬──────┬──────┬──────┐
│ D-1  │ D-2  │ D-3  │ D-4  │  Row 1: Down (정면)
├──────┼──────┼──────┼──────┤
│ L-1  │ L-2  │ L-3  │ L-4  │  Row 2: Left (좌측)
├──────┼──────┼──────┼──────┤
│ R-1  │ R-2  │ R-3  │ R-4  │  Row 3: Right (우측)
├──────┼──────┼──────┼──────┤
│ U-1  │ U-2  │ U-3  │ U-4  │  Row 4: Up (후면)
└──────┴──────┴──────┴──────┘

총 크기: 192×256 픽셀
프레임 크기: 48×64 픽셀
```

### 1.3 캐릭터별 프롬프트 예시

#### 사무직 남성
```
pixel art character sprite sheet, 4x4 grid, 192x256 pixels total,
48x64 pixels per frame, top-down RPG style,
solid magenta background #FF00FF,
4 directions x 4 walk cycle frames,
young office worker male, blue suit, short black hair,
chibi proportions, clean pixel edges, no anti-aliasing
```

#### 캐주얼 여성
```
pixel art character sprite sheet, 4x4 grid, 192x256 pixels total,
48x64 pixels per frame, top-down RPG style,
solid magenta background #FF00FF,
4 directions x 4 walk cycle frames,
young woman, casual pink hoodie, long brown hair, blue jeans,
chibi proportions, clean pixel edges, no anti-aliasing
```

#### 개발자
```
pixel art character sprite sheet, 4x4 grid, 192x256 pixels total,
48x64 pixels per frame, top-down RPG style,
solid magenta background #FF00FF,
4 directions x 4 walk cycle frames,
programmer, black hoodie, glasses, laptop bag,
chibi proportions, clean pixel edges, no anti-aliasing
```

#### 판타지 마법사
```
pixel art character sprite sheet, 4x4 grid, 192x256 pixels total,
48x64 pixels per frame, top-down RPG style,
solid magenta background #FF00FF,
4 directions x 4 walk cycle frames,
wizard with purple robe, white beard, wooden staff,
chibi proportions, clean pixel edges, no anti-aliasing
```

### 1.4 프롬프트 필수 요소

| 요소 | 값 | 필수 | 이유 |
|-----|-----|-----|------|
| `solid magenta background #FF00FF` | 마젠타 | ✅ | 크로마키 처리용 |
| `192x256 pixels total` | 고정 | ✅ | 4×4 그리드 총 크기 |
| `48x64 pixels per frame` | 고정 | ✅ | Phaser 프레임 크기 |
| `4x4 grid` | 고정 | ✅ | 방향×애니메이션 |
| `no anti-aliasing` | 고정 | ✅ | 픽셀 선명도 |
| `chibi proportions` | 권장 | ⭕ | 메타버스 스타일 |
| `clean pixel edges` | 권장 | ⭕ | 크로마키 분리 용이 |
| `top-down RPG style` | 권장 | ⭕ | 시점 통일 |

---

## 2. JPEG → PNG 변환

### 2.1 Python 스크립트 (권장)

**설치**:
```bash
pip install Pillow numpy
```

**기본 사용**:
```bash
# 단일 파일
python scripts/chroma_to_png.py --in sprite.jpg --out sprite.png

# 폴더 일괄 처리
python scripts/chroma_to_png.py --in ./sprites_jpeg --out ./sprites_png
```

**JPEG 아티팩트 처리** (tolerance 조절):
```bash
# tolerance 50으로 JPEG 압축 노이즈 허용
python scripts/chroma_to_png.py --in ./in --out ./out --tol 50
```

**헤일로 제거** (erosion/dilation):
```bash
# erode 1회로 가장자리 보라색 번짐 제거
python scripts/chroma_to_png.py --in ./in --out ./out --tol 40 --erode 1

# erode 후 dilate로 크기 복원 (더 깔끔한 결과)
python scripts/chroma_to_png.py --in ./in --out ./out --tol 40 --erode 1 --dilate 1
```

**전체 옵션**:
```bash
python scripts/chroma_to_png.py \
  --in ./in \
  --out ./out \
  --key "#FF00FF" \
  --tol 40 \
  --erode 1 \
  --dilate 1 \
  --verbose
```

### 2.2 ImageMagick 대안 (빠른 처리)

**기본 변환**:
```bash
magick input.jpg -fuzz 15% -transparent "#FF00FF" output.png
```

**일괄 처리**:
```bash
# Windows PowerShell
Get-ChildItem *.jpg | ForEach-Object {
  magick $_.Name -fuzz 15% -transparent "#FF00FF" "$($_.BaseName).png"
}

# Linux/Mac
for f in *.jpg; do
  magick "$f" -fuzz 15% -transparent "#FF00FF" "${f%.jpg}.png"
done
```

**fuzz 값 가이드**:
| fuzz 값 | 용도 |
|---------|------|
| 5% | 고품질 원본, 최소 노이즈 |
| 10-15% | 일반 JPEG (권장) |
| 20-25% | 고압축 JPEG, 노이즈 많음 |

> ⚠️ ImageMagick은 erosion/dilation 후처리가 복잡하므로, 헤일로 문제 시 Python 스크립트 권장

---

## 3. 변환 검증 체크리스트

### 3.1 필수 검증 항목 (5개)

| # | 항목 | 검증 방법 | 기대값 |
|---|------|----------|--------|
| 1 | **파일 형식** | `file output.png` | PNG image, RGBA |
| 2 | **알파 채널** | 이미지 뷰어에서 투명 배경 확인 | 배경 완전 투명 |
| 3 | **헤일로 없음** | 캐릭터 가장자리 확대 | 보라색 번짐 없음 |
| 4 | **크기 일치** | `identify output.png` | 192×256 픽셀 |
| 5 | **픽셀 선명도** | 400% 확대 | 블러/안티앨리어싱 없음 |

### 3.2 Python 검증 스크립트

```python
from PIL import Image

def verify_sprite(path):
    img = Image.open(path)

    # 1. RGBA 모드 확인
    assert img.mode == 'RGBA', f"Expected RGBA, got {img.mode}"

    # 2. 크기 확인
    assert img.size == (192, 256), f"Expected 192x256, got {img.size}"

    # 3. 투명 픽셀 존재 확인
    alpha = img.split()[3]
    has_transparent = any(p == 0 for p in alpha.getdata())
    assert has_transparent, "No transparent pixels found"

    # 4. 마젠타 잔류 확인
    pixels = list(img.getdata())
    magenta_count = sum(1 for r,g,b,a in pixels
                        if a > 0 and r > 200 and g < 50 and b > 200)
    assert magenta_count < 100, f"Too much magenta remaining: {magenta_count}"

    print(f"✅ {path} - All checks passed!")

# 사용
verify_sprite("output.png")
```

### 3.3 Phaser 테스트

```typescript
// 스프라이트 로드 테스트
this.load.spritesheet('character', 'assets/character.png', {
  frameWidth: 48,
  frameHeight: 64
});

// 렌더링 확인
const sprite = this.add.sprite(400, 300, 'character', 0);
sprite.setScale(4); // 확대해서 투명도 확인
```

---

## 4. 에셋 저장 경로

```
/public/assets/game/sprites/
├── characters/
│   ├── char_office_male.png      # 사무직 남성
│   ├── char_casual_female.png    # 캐주얼 여성
│   ├── char_developer.png        # 개발자
│   └── char_wizard.png           # 판타지 마법사
└── raw/                          # 원본 JPEG (git ignore)
    └── *.jpg
```

---

## 5. 문제 해결

### 5.1 마젠타 잔류

**증상**: 캐릭터 주변에 보라색 픽셀 남음
**해결**: tolerance 값 증가 (40→60) 또는 erode 적용

```bash
python scripts/chroma_to_png.py --in ./in --out ./out --tol 60 --erode 1
```

### 5.2 캐릭터 가장자리 잘림

**증상**: erode로 캐릭터 픽셀까지 제거됨
**해결**: erode 후 dilate로 복원

```bash
python scripts/chroma_to_png.py --in ./in --out ./out --erode 1 --dilate 1
```

### 5.3 JPEG 압축 아티팩트

**증상**: 배경에 노이즈성 반투명 픽셀
**해결**: tolerance 증가 + 원본 JPEG 품질 향상 요청

```bash
python scripts/chroma_to_png.py --in ./in --out ./out --tol 70
```

---

## 변경 이력

| 날짜 | 변경 |
|-----|------|
| 2025-12-30 | 초기 생성 - Nanobanana3 프롬프트, 변환 도구, 검증 체크리스트 |
