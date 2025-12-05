---
name: flow-ui
description: "Primary Color 기반 디자인 시스템으로 완성형 UI를 생성합니다. Use when the user requests UI components, pages, landing pages, login screens, hero sections, forms, cards, or any React/Next.js UI development with shadcn/ui and Tailwind CSS."
---

# Flow UI Skill

> **"Primary Color만 바꾸면 브랜드 완성"**
> 자연어 요청으로 정의된 룰에 따라 완성형 UI를 생성하는 디자인 시스템 스킬

## Requirements

- Next.js 15+
- React 19+
- Tailwind CSS 4+
- shadcn/ui (new-york style)

## Behavior

- 응답 형식: 설계 요약 (3~5줄) → 코드
- 문서 자동 생성 금지
- Feature Batch 완료 후 사용자 요청 시만 문서화

---

## 1. 핵심 가치

### 1.1 One Change, Full Brand
- `/src/app/globals.css`의 `--primary` 값만 변경
- 전체 UI가 새 브랜드 컬러로 자동 반영
- 일관된 디자인 토큰 시스템

### 1.2 자연어 → 완성형 UI
- "로그인 페이지 만들어줘" → 완전한 로그인 UI 생성
- "히어로 섹션 추가해줘" → 정의된 패턴에 따른 섹션 생성
- 정의된 컴포넌트와 룰만 사용

---

## 2. 프로젝트 컨텍스트 로딩

### 2.1 필수 참조 파일

스킬 적용 전 반드시 읽어야 할 파일:

```
1. /docs/prd.md (또는 /docs/PRD.md)
   → 프로젝트명, 목적, 범위, 타겟 유저
   → Primary Color 정의

2. /claude.md
   → 전역 원칙 (헌법)
   → 버튼 규칙, 네이밍 체계, 접근성 요구사항

3. /src/components/claude.md
   → 컴포넌트 분류 및 사용 가이드
   → 모달 상태도

4. /src/app/globals.css
   → 디자인 토큰 정의
   → Primary Color 현재 값
```

### 2.2 컨텍스트 체크리스트

UI 생성 전 확인사항:
- [ ] PRD에서 프로젝트 목적 파악
- [ ] Primary Color 확인
- [ ] 버튼 variant 제한 숙지 (default, outline 주사용)
- [ ] i18n 규칙 확인 (하드코딩 금지)

---

## 3. 디자인 토큰 시스템

### 3.1 Color Tokens

```css
/* globals.css에서 관리 */
:root {
  /* Primary - 이 값만 변경하면 브랜드 변경 */
  --primary: hsl(168 64% 50%);
  --primary-foreground: hsl(0 0% 100%);

  /* Semantic Colors */
  --background: hsl(0 0% 100%);
  --foreground: hsl(0 0% 3.9%);
  --muted: hsl(0 0% 96.1%);
  --muted-foreground: hsl(0 0% 45.1%);
  --accent: hsl(0 0% 96.1%);
  --accent-foreground: hsl(0 0% 9%);
  --destructive: hsl(0 84.2% 60.2%);
  --border: hsl(0 0% 89.8%);
  --ring: hsl(0 0% 3.9%);
}
```

### 3.2 Spacing & Typography

```css
/* Tailwind 표준 사용 */
spacing: 4px 단위 (p-4 = 16px)
font-size: text-sm, text-base, text-lg, text-xl...
font-weight: font-normal, font-medium, font-semibold, font-bold
```

---

## 4. 컴포넌트 시스템

### 4.1 사용 가능한 컴포넌트

```tsx
import {
  // Interactive
  Button, Input, Badge,

  // Layout
  Container, Section, Stack, HStack, VStack, Grid, GridItem, Divider,

  // Typography
  Heading, Text,

  // Visual
  Card, CardHeader, CardContent, CardFooter, CardTitle, CardDescription,
  Avatar, AvatarImage, AvatarFallback, AvatarGroup,
  IconBox,
} from "@/components/ui"
```

### 4.2 버튼 사용 규칙

| 상황 | Variant | 예시 |
|-----|---------|------|
| CTA, 주요 액션 | `default` | "시작하기", "저장" |
| 보조 액션 | `outline` | "취소", "더 보기" |
| 삭제/위험 (요청 시만) | `destructive` | "삭제", "탈퇴" |
| 최소 강조 (요청 시만) | `ghost` | 네비게이션 링크 |

**규칙**: 기본적으로 `default` + `outline`만 사용. 예비 버튼은 사용자 명시적 요청 시만 적용.

### 4.3 레이아웃 패턴

```tsx
// 기본 페이지 구조
<Container>
  <Section spacing="lg">
    <VStack gap={8}>
      <Heading level={1}>제목</Heading>
      <Text variant="lead">설명</Text>
    </VStack>
  </Section>
</Container>

// 카드 그리드
<Grid cols={3} gap={6}>
  <Card>...</Card>
  <Card>...</Card>
  <Card>...</Card>
</Grid>

// 히어로 섹션
<Section spacing="xl" className="bg-muted">
  <Container size="lg">
    <VStack gap={6} align="center" className="text-center">
      <Heading level={1}>히어로 제목</Heading>
      <Text variant="lead" className="max-w-2xl">설명 텍스트</Text>
      <HStack gap={4}>
        <Button size="lg">Primary CTA</Button>
        <Button variant="outline" size="lg">Secondary</Button>
      </HStack>
    </VStack>
  </Container>
</Section>
```

---

## 5. 접근성 요구사항

### 5.1 기본 원칙
- WCAG 2.1 Level AA 준수
- 색상 대비 4.5:1 이상
- 모든 인터랙션 키보드 접근 가능

### 5.2 모달 필수 요구사항
- 열릴 때 포커스 이동
- Tab 포커스 트랩
- ESC 닫기
- 닫힐 때 트리거로 포커스 복귀
- `role="dialog"` + `aria-modal="true"`
- `aria-labelledby` 또는 `aria-label`

---

## 6. i18n 규칙

### 6.1 텍스트 관리
- 모든 UI 텍스트는 `/src/lib/text-config.ts`에서 관리
- 컴포넌트 내 하드코딩 한글 **금지**

### 6.2 톤 코드
| 코드 | 용도 | 예시 |
|-----|------|------|
| `Confirm` | 긍정적 확인 | "저장되었습니다" |
| `Destructive` | 파괴적/위험 | "삭제하시겠습니까?" |
| `Soft` | 부드러운 안내 | "입력해 주세요" |
| `Neutral` | 중립적 정보 | "총 3개" |

---

## 7. 네이밍 체계

```
{TYPE}.{DOMAIN}.{CONTEXT}.{NUMBER}
```

| TYPE | 용도 | 예시 |
|------|------|------|
| SID | Screen ID | `SID.AUTH.LOGIN.001` |
| LID | Label ID | `LID.MODAL.DELETE.001` |
| BTN | Button ID | `BTN.PRIMARY.SUBMIT.001` |

---

## 8. 토큰 효율 원칙

> **핵심**: 문서 자동 생성 금지, 요청 시만 업데이트

### 8.1 응답 형식

```
✅ 기본 응답: 설계 요약 (3~5줄) + 코드
❌ 금지: 매 요청마다 문서 자동 생성
```

### 8.2 문서 업데이트 트리거

| 상황 | 문서 작업 |
|-----|----------|
| 코딩 요청 | ❌ 문서 작성 안함 |
| Feature Batch 완료 | ⏳ 사용자 요청 시만 |
| "문서 업데이트해줘" | ✅ 델타만 업데이트 |

### 8.3 델타 업데이트 규칙

- 전체 문서 재작성 **금지**
- 추가/수정된 섹션만 업데이트
- `/docs/changes/changelog.md`에 변경 기록

---

## 9. 생성 워크플로우

### 9.1 UI 생성 요청 시 프로세스

```
1. PRD 확인 → 프로젝트 컨텍스트 파악
2. 요청 분석 → 필요한 컴포넌트 식별
3. 설계 요약 (3~5줄) → 응답에 포함
4. 네이밍 부여 → ID 체계에 따라
5. 컴포넌트 조합 → 정의된 패턴 사용
6. i18n 적용 → text-config.ts 활용
7. 접근성 검증 → 체크리스트 확인 (/docs/checklists/)
8. (선택) Feature Batch 완료 후 문서 요청 시만 업데이트
```

### 9.2 금지 사항

- ❌ 정의되지 않은 버튼 variant 사용
- ❌ 토큰 하드코딩 (`bg-[#xxx]` 금지)
- ❌ 컴포넌트 내 한글 하드코딩
- ❌ 버튼 variant 확장
- ❌ 전역 원칙 재정의
- ❌ 문서 자동 생성

---

## 10. 예시: 자연어 → UI

### 요청: "간단한 로그인 페이지 만들어줘"

```tsx
// pages/login/page.tsx
import { Container, Section, VStack, Heading, Text, Button, Input, Card, CardHeader, CardContent, CardFooter } from "@/components/ui"
import { getText } from "@/lib/text-config"

export default function LoginPage() {
  return (
    <Container size="sm" className="min-h-screen flex items-center">
      <Section>
        <Card>
          <CardHeader>
            <VStack gap={2} align="center">
              <Heading level={1} size="2xl">
                {getText("LID.AUTH.LOGIN.TITLE")}
              </Heading>
              <Text variant="muted">
                {getText("LID.AUTH.LOGIN.SUBTITLE")}
              </Text>
            </VStack>
          </CardHeader>

          <CardContent>
            <VStack gap={4}>
              <Input
                type="email"
                placeholder={getText("LID.AUTH.EMAIL.PLACEHOLDER")}
                aria-label={getText("LID.AUTH.EMAIL.LABEL")}
              />
              <Input
                type="password"
                placeholder={getText("LID.AUTH.PASSWORD.PLACEHOLDER")}
                aria-label={getText("LID.AUTH.PASSWORD.LABEL")}
              />
            </VStack>
          </CardContent>

          <CardFooter>
            <VStack gap={3} className="w-full">
              <Button className="w-full" size="lg">
                {getText("BTN.AUTH.LOGIN")}
              </Button>
              <Button variant="outline" className="w-full">
                {getText("BTN.AUTH.REGISTER")}
              </Button>
            </VStack>
          </CardFooter>
        </Card>
      </Section>
    </Container>
  )
}
```
