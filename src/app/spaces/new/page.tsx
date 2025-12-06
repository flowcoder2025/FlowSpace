"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Container,
  Section,
  Stack,
  HStack,
  VStack,
  Grid,
  GridItem,
  Heading,
  Text,
  Button,
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
  Input,
  Badge,
} from "@/components/ui"
import { getText } from "@/lib/text-config"

// ============================================
// Types
// ============================================
type TemplateKey = "OFFICE" | "CLASSROOM" | "LOUNGE"
type AccessType = "PUBLIC" | "PRIVATE" | "PASSWORD"

interface Template {
  key: TemplateKey
  name: string
  description: string
  badge?: string
}

// ============================================
// Template Data
// ============================================
const TEMPLATES: Template[] = [
  {
    key: "OFFICE",
    name: getText("LID.LANDING.TEMPLATE.OFFICE"),
    description: getText("LID.LANDING.TEMPLATE.OFFICE.DESC"),
    badge: "인기",
  },
  {
    key: "CLASSROOM",
    name: getText("LID.LANDING.TEMPLATE.CLASSROOM"),
    description: getText("LID.LANDING.TEMPLATE.CLASSROOM.DESC"),
  },
  {
    key: "LOUNGE",
    name: getText("LID.LANDING.TEMPLATE.LOUNGE"),
    description: getText("LID.LANDING.TEMPLATE.LOUNGE.DESC"),
  },
]

// ============================================
// Template Select Card
// ============================================
function TemplateSelectCard({
  template,
  selected,
  onSelect,
}: {
  template: Template
  selected: boolean
  onSelect: () => void
}) {
  return (
    <Card
      className={`cursor-pointer transition-all ${
        selected
          ? "border-primary ring-2 ring-primary/20"
          : "hover:border-primary/50"
      }`}
      onClick={onSelect}
    >
      <CardHeader>
        <HStack justify="between" align="start">
          <CardTitle className={selected ? "text-primary" : ""}>
            {template.name}
          </CardTitle>
          {template.badge && <Badge variant="secondary">{template.badge}</Badge>}
        </HStack>
      </CardHeader>
      <CardContent>
        <CardDescription>{template.description}</CardDescription>
        <div
          className={`mt-4 h-24 rounded-lg transition-colors ${
            selected ? "bg-primary/10" : "bg-muted"
          }`}
        />
      </CardContent>
    </Card>
  )
}

// ============================================
// Access Type Button
// ============================================
function AccessTypeButton({
  type,
  label,
  description,
  selected,
  onSelect,
}: {
  type: AccessType
  label: string
  description: string
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      className={`w-full rounded-lg border-2 p-4 text-left transition-all ${
        selected
          ? "border-primary bg-primary/5"
          : "border-border hover:border-primary/50"
      }`}
      onClick={onSelect}
    >
      <Text weight="medium" className={selected ? "text-primary" : ""}>
        {label}
      </Text>
      <Text tone="muted" size="sm" className="mt-1">
        {description}
      </Text>
    </button>
  )
}

// ============================================
// Create Space Page
// ============================================
export default function CreateSpacePage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  // Form state
  const [name, setName] = useState("")
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateKey>("OFFICE")
  const [accessType, setAccessType] = useState<AccessType>("PUBLIC")
  const [password, setPassword] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      alert("공간 이름을 입력해주세요")
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch("/api/spaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          templateKey: selectedTemplate,
          accessType,
          accessSecret: accessType === "PASSWORD" ? password : undefined,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to create space")
      }

      const space = await response.json()
      router.push(`/admin/spaces/${space.id}`)
    } catch (error) {
      console.error("Failed to create space:", error)
      alert("공간 생성에 실패했습니다")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-muted/30">
      {/* Navigation */}
      <nav className="border-b bg-background">
        <Container>
          <HStack justify="between" className="h-16">
            <Link href="/" className="flex items-center gap-2">
              <img src="/logo.jpg" alt="Flow Metaverse" className="size-8 rounded-lg object-contain" />
              <Text weight="semibold" size="lg">
                Flow Metaverse
              </Text>
            </Link>
            <Button variant="outline" asChild>
              <Link href="/">{getText("BTN.SECONDARY.BACK")}</Link>
            </Button>
          </HStack>
        </Container>
      </nav>

      <Section spacing="lg">
        <Container size="md">
          <form onSubmit={handleSubmit}>
            <VStack gap="xl">
              {/* Header */}
              <VStack gap="sm">
                <Heading as="h1" size="3xl">
                  {getText("LID.SPACE.CREATE.TITLE")}
                </Heading>
                <Text tone="muted">
                  템플릿을 선택하고 공간 정보를 입력하세요
                </Text>
              </VStack>

              {/* Space Name */}
              <VStack gap="sm">
                <label htmlFor="space-name">
                  <Text weight="medium">{getText("LID.SPACE.NAME.LABEL")}</Text>
                </label>
                <Input
                  id="space-name"
                  type="text"
                  placeholder={getText("LID.SPACE.NAME.PLACEHOLDER")}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </VStack>

              {/* Template Selection */}
              <VStack gap="default">
                <Text weight="medium">{getText("LID.SPACE.TEMPLATE.LABEL")}</Text>
                <Grid cols={3} gap="default">
                  {TEMPLATES.map((template) => (
                    <GridItem key={template.key}>
                      <TemplateSelectCard
                        template={template}
                        selected={selectedTemplate === template.key}
                        onSelect={() => setSelectedTemplate(template.key)}
                      />
                    </GridItem>
                  ))}
                </Grid>
              </VStack>

              {/* Access Type */}
              <VStack gap="default">
                <Text weight="medium">{getText("LID.SPACE.ACCESS.LABEL")}</Text>
                <Stack direction="row" gap="default">
                  <AccessTypeButton
                    type="PUBLIC"
                    label={getText("LID.SPACE.ACCESS.PUBLIC")}
                    description="누구나 링크로 입장할 수 있습니다"
                    selected={accessType === "PUBLIC"}
                    onSelect={() => setAccessType("PUBLIC")}
                  />
                  <AccessTypeButton
                    type="PRIVATE"
                    label={getText("LID.SPACE.ACCESS.PRIVATE")}
                    description="초대된 사용자만 입장할 수 있습니다"
                    selected={accessType === "PRIVATE"}
                    onSelect={() => setAccessType("PRIVATE")}
                  />
                  <AccessTypeButton
                    type="PASSWORD"
                    label={getText("LID.SPACE.ACCESS.PASSWORD")}
                    description="암호를 아는 사용자만 입장할 수 있습니다"
                    selected={accessType === "PASSWORD"}
                    onSelect={() => setAccessType("PASSWORD")}
                  />
                </Stack>

                {/* Password Input */}
                {accessType === "PASSWORD" && (
                  <Input
                    type="password"
                    placeholder="입장 암호를 설정하세요"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                )}
              </VStack>

              {/* Submit */}
              <HStack justify="end" gap="default" className="pt-4">
                <Button variant="outline" type="button" asChild>
                  <Link href="/">{getText("BTN.SECONDARY.CANCEL")}</Link>
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "생성 중..." : getText("BTN.SPACE.CREATE")}
                </Button>
              </HStack>
            </VStack>
          </form>
        </Container>
      </Section>
    </main>
  )
}
