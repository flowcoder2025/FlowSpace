/**
 * Space API Routes
 *
 * POST /api/spaces - 공간 생성
 * GET /api/spaces - 공간 목록 조회
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createSpaceOwner, canCreateSpace } from "@/lib/space-auth"
import { SpaceAccessType, SpaceStatus, TemplateKey } from "@prisma/client"
import {
  IS_DEV,
  getUserIdFromSession,
} from "@/lib/api-helpers"

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
    // 1. 인증 확인
    const ownerId = await getUserIdFromSession(true) // 개발 환경에서 테스트 사용자 허용
    if (!ownerId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // 2. 공간 생성 권한 확인 (SuperAdmin 또는 유료 구독자만 가능)
    const hasCreatePermission = await canCreateSpace(ownerId)
    if (!hasCreatePermission) {
      return NextResponse.json(
        { error: "공간 생성 권한이 없습니다. 유료 플랜을 구독하거나 관리자에게 문의하세요." },
        { status: 403 }
      )
    }

    // 3. Request body 파싱
    const body: CreateSpaceBody = await request.json()

    // 4. 필수 필드 검증
    if (!body.name || !body.templateKey) {
      return NextResponse.json(
        { error: "Missing required fields: name, templateKey" },
        { status: 400 }
      )
    }

    // 5. 입력값 검증
    if (body.name.length > 100) {
      return NextResponse.json(
        { error: "Name must be 100 characters or less" },
        { status: 400 }
      )
    }

    if (body.description && body.description.length > 500) {
      return NextResponse.json(
        { error: "Description must be 500 characters or less" },
        { status: 400 }
      )
    }

    // 6. 템플릿 조회
    const template = await prisma.template.findUnique({
      where: { key: body.templateKey },
    })

    if (!template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      )
    }

    // 7. 공간 생성
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

    // 8. 소유자 멤버십 자동 생성 (OWNER 역할)
    await createSpaceOwner(space.id, ownerId)

    if (IS_DEV) {
      console.log("[Spaces API] Space created:", space.id, "by", ownerId)
    }

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
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "10"), 100) // 최대 100개
    const offset = Math.max(parseInt(searchParams.get("offset") ?? "0"), 0)

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
