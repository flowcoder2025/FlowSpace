# Flow UI Skill 설치 가이드

## 빠른 시작

### 1. 필수 파일 복사

새 프로젝트에 다음 파일/폴더를 복사합니다:

```bash
# 디렉토리 구조 생성
mkdir -p .claude/skills
mkdir -p docs
mkdir -p src/components/ui
mkdir -p src/lib

# 필수 파일 복사
cp flow_UI/claude.md ./claude.md
cp flow_UI/docs/prd.md ./docs/prd.md
cp flow_UI/src/components/claude.md ./src/components/claude.md
cp -r flow_UI/src/components/ui/* ./src/components/ui/
cp flow_UI/src/lib/utils.ts ./src/lib/utils.ts
cp flow_UI/src/lib/text-config.ts ./src/lib/text-config.ts
cp flow_UI/src/app/globals.css ./src/app/globals.css

# 스킬 파일 복사
cp -r flow_UI/.claude/skills/* ./.claude/skills/
```

### 2. PRD 커스터마이징

`/docs/prd.md`를 열고 프로젝트 정보를 입력합니다:

```markdown
## 프로젝트명
**[여기에 프로젝트명 입력]**

## 목적
### 핵심 문제
- [해결하려는 문제]

## 브랜드 정의
### Primary Color
```css
--primary: hsl(XXX XX% XX%);  /* 브랜드 컬러로 변경 */
```
```

### 3. Primary Color 적용

`/src/app/globals.css`에서 `--primary` 값을 브랜드 컬러로 변경:

```css
:root {
  --primary: hsl(220 90% 56%);  /* 예: Blue 브랜드 */
}
```

### 4. 의존성 설치

```bash
# shadcn/ui 의존성
npm install class-variance-authority clsx tailwind-merge
npm install @radix-ui/react-slot

# 필요시 추가 설치
npx shadcn@latest init
```

---

## 파일 구조

설치 후 프로젝트 구조:

```
/{project_root}
├── claude.md                    # 전역 원칙 (헌법)
├── .claude/
│   └── skills/
│       ├── flow-ui.md           # 스킬 정의
│       ├── manifest.json        # 메타데이터
│       └── INSTALL.md           # 이 파일
│
├── docs/
│   └── prd.md                   # 프로젝트 정의 (SSOT)
│
├── src/
│   ├── app/
│   │   └── globals.css          # 디자인 토큰
│   │
│   ├── components/
│   │   ├── claude.md            # 컴포넌트 가이드
│   │   └── ui/
│   │       ├── button.tsx
│   │       ├── container.tsx
│   │       ├── section.tsx
│   │       ├── stack.tsx
│   │       ├── grid.tsx
│   │       ├── divider.tsx
│   │       ├── heading.tsx
│   │       ├── text.tsx
│   │       ├── card.tsx
│   │       ├── badge.tsx
│   │       ├── avatar.tsx
│   │       ├── icon-box.tsx
│   │       ├── input.tsx
│   │       └── index.ts
│   │
│   └── lib/
│       ├── utils.ts             # cn() 헬퍼
│       └── text-config.ts       # i18n 텍스트
```

---

## 사용 예시

### Claude에게 요청하기

스킬 설치 후 자연어로 UI를 요청할 수 있습니다:

```
"히어로 섹션 만들어줘"
"카드 그리드로 기능 소개 섹션 추가해줘"
"로그인 폼 만들어줘"
"푸터 컴포넌트 생성해줘"
```

### 컴포넌트 Import

```tsx
import {
  Button,
  Container,
  Section,
  VStack,
  Heading,
  Text,
  Card,
} from "@/components/ui"
```

---

## 커스터마이징

### 추가 컴포넌트

새 컴포넌트 추가 시:

1. `/src/components/ui/{name}.tsx` 생성
2. CVA 패턴 사용
3. `/src/components/ui/index.ts`에 export 추가
4. `/src/components/claude.md` 컴포넌트 분류 업데이트

### 디자인 토큰 확장

`globals.css`에 새 토큰 추가 시 CSS Variables 규칙 준수:

```css
:root {
  --custom-token: hsl(XXX XX% XX%);
}

.dark {
  --custom-token: hsl(XXX XX% XX%);
}
```

---

## 체크리스트

설치 완료 확인:

- [ ] `claude.md` 루트에 존재
- [ ] `docs/prd.md` 프로젝트 정보 입력됨
- [ ] `src/app/globals.css`에 Primary Color 설정됨
- [ ] `src/components/ui/` 모든 컴포넌트 존재
- [ ] `src/lib/utils.ts` cn() 함수 존재
- [ ] 의존성 설치 완료 (cva, clsx, tailwind-merge)

---

## 문제 해결

### "cn is not defined" 오류

```bash
npm install clsx tailwind-merge
```

`src/lib/utils.ts` 확인:
```ts
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

### 컴포넌트 스타일 미적용

1. `tailwind.config.ts`에 content 경로 확인
2. `globals.css`가 layout.tsx에서 import 되는지 확인

### Primary Color 미반영

`globals.css`의 `:root` 섹션에서 `--primary` 값이 올바른지 확인

---

## 버전 관리

| 버전 | 날짜 | 변경 내용 |
|-----|------|---------|
| 1.0.0 | 2025-12-05 | 초기 릴리즈 |
