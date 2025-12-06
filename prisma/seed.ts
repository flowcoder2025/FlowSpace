/**
 * Prisma Seed Script
 *
 * 기본 템플릿 3종 생성
 * 실행: npx prisma db seed
 */

import { PrismaClient, TemplateKey } from "@prisma/client"

const prisma = new PrismaClient()

// 테스트 사용자 ID (개발용)
export const TEST_USER_ID = "test-user-dev-001"

async function main() {
  console.log("🌱 Seeding database...")

  // 테스트 사용자 생성
  console.log("  👤 Creating test user...")
  const existingUser = await prisma.user.findUnique({
    where: { id: TEST_USER_ID },
  })

  if (!existingUser) {
    await prisma.user.create({
      data: {
        id: TEST_USER_ID,
        name: "테스트 사용자",
        email: "test@flowmetaverse.dev",
      },
    })
    console.log("  ✅ Created test user: test@flowmetaverse.dev")
  } else {
    console.log("  ⏭️  Test user already exists, skipping...")
  }

  console.log("  📦 Creating templates...")

  // 템플릿 3종 생성
  const templates = [
    {
      key: TemplateKey.OFFICE,
      name: "오피스",
      description: "가상 사무실에서 팀원들과 협업하세요. 회의실, 휴게실, 개인 데스크가 포함되어 있습니다.",
      version: "1.0.0",
      assetsPath: "/assets/templates/office",
      previewUrl: "/images/templates/office-preview.png",
    },
    {
      key: TemplateKey.CLASSROOM,
      name: "강의실",
      description: "세미나, 교육, 발표에 최적화된 공간입니다. 무대, 관객석, Q&A 영역이 있습니다.",
      version: "1.0.0",
      assetsPath: "/assets/templates/classroom",
      previewUrl: "/images/templates/classroom-preview.png",
    },
    {
      key: TemplateKey.LOUNGE,
      name: "라운지",
      description: "네트워킹과 자유로운 소통을 위한 공간입니다. 소파 영역, 게임 코너, 음료바가 있습니다.",
      version: "1.0.0",
      assetsPath: "/assets/templates/lounge",
      previewUrl: "/images/templates/lounge-preview.png",
    },
  ]

  for (const template of templates) {
    const existing = await prisma.template.findUnique({
      where: { key: template.key },
    })

    if (existing) {
      console.log(`  ⏭️  Template "${template.name}" already exists, skipping...`)
      continue
    }

    await prisma.template.create({
      data: template,
    })
    console.log(`  ✅ Created template: ${template.name}`)
  }

  console.log("✨ Seeding completed!")
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
