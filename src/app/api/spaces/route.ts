/**
 * Space API Routes
 *
 * POST /api/spaces - 공간 생성
 * GET /api/spaces - 공간 목록 조회
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { SpaceAccessType, SpaceStatus, TemplateKey } from "@prisma/client"

// ============================================
// Types
// ============================================
interface CreateSpaceBody {
  name: string
  description?: string
  templateKey: TemplateKey
  accessType?: SpaceAccessType
  accessSecret?: string
  logoUrl?: string
  primaryColor?: string
  loadingMessage?: string
}

// ============================================
// POST /api/spaces - 공간 생성
// ============================================
export async function POST(request: NextRequest) {
  try {
    const body: CreateSpaceBody = await request.json()

    // TODO: 인증 구현 후 실제 사용자 ID 사용
    // const session = await auth()
    // if (!session?.user?.id) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    // }
    // const ownerId = session.user.id

    // 임시: 테스트용 사용자 ID (실제 구현 시 제거)
    // seed.ts의 TEST_USER_ID와 동일한 값 사용
    const ownerId = "test-user-dev-001"

    // 템플릿 조회
    const template = await prisma.template.findUnique({
      where: { key: body.templateKey },
    })

    if (!template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      )
    }

    // 공간 생성
    const space = await prisma.space.create({
      data: {
        name: body.name,
        description: body.description,
        ownerId,
        templateId: template.id,
        accessType: body.accessType ?? SpaceAccessType.PUBLIC,
        accessSecret: body.accessSecret,
        logoUrl: body.logoUrl,
        primaryColor: body.primaryColor,
        loadingMessage: body.loadingMessage,
        status: SpaceStatus.ACTIVE,
      },
      include: {
        template: true,
      },
    })

    return NextResponse.json(space, { status: 201 })
  } catch (error) {
    console.error("Failed to create space:", error)
    return NextResponse.json(
      { error: "Failed to create space" },
      { status: 500 }
    )
  }
}

// ============================================
// GET /api/spaces - 공간 목록 조회
// ============================================
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const ownerId = searchParams.get("ownerId")
    const status = searchParams.get("status") as SpaceStatus | null
    const limit = parseInt(searchParams.get("limit") ?? "10")
    const offset = parseInt(searchParams.get("offset") ?? "0")

    const where = {
      ...(ownerId && { ownerId }),
      ...(status && { status }),
      deletedAt: null,
    }

    const [spaces, total] = await Promise.all([
      prisma.space.findMany({
        where,
        include: {
          template: true,
          _count: {
            select: {
              eventLogs: true,
              guestSessions: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.space.count({ where }),
    ])

    return NextResponse.json({
      data: spaces,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    })
  } catch (error) {
    console.error("Failed to fetch spaces:", error)
    return NextResponse.json(
      { error: "Failed to fetch spaces" },
      { status: 500 }
    )
  }
}
