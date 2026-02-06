/**
 * Internal Space API - 서비스 간 통신용
 *
 * POST /api/internal/spaces - 비밀번호 방 생성 (API 키 인증)
 *
 * FlowConsult 등 외부 서비스에서 SuperAdmin 세션 없이
 * API 키 기반으로 Space를 생성할 수 있는 엔드포인트
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { SpaceAccessType, SpaceStatus } from "@prisma/client"

function verifyInternalApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get("x-internal-api-key")
  const expected = process.env.INTERNAL_API_KEY
  if (!expected) {
    console.error("[Internal API] INTERNAL_API_KEY is not configured")
    return false
  }
  return apiKey === expected
}

interface CreateInternalSpaceBody {
  name: string
  description?: string
  templateKey?: string
  accessSecret: string
  ownerId: string
}

export async function POST(request: NextRequest) {
  // 1. API 키 인증
  if (!verifyInternalApiKey(request)) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    )
  }

  try {
    // 2. Body 파싱
    const body: CreateInternalSpaceBody = await request.json()

    if (!body.name || !body.accessSecret || !body.ownerId) {
      return NextResponse.json(
        { error: "Missing required fields: name, accessSecret, ownerId" },
        { status: 400 }
      )
    }

    // 3. 소유자 존재 확인
    const owner = await prisma.user.findUnique({
      where: { id: body.ownerId },
      select: { id: true },
    })
    if (!owner) {
      return NextResponse.json(
        { error: "Owner not found" },
        { status: 404 }
      )
    }

    // 4. 템플릿 조회 (기본: OFFICE)
    const templateKey = body.templateKey ?? "OFFICE"
    const template = await prisma.template.findUnique({
      where: { key: templateKey as never },
    })
    if (!template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      )
    }

    // 5. Space 생성 (PASSWORD 타입)
    const space = await prisma.space.create({
      data: {
        name: body.name,
        description: body.description,
        ownerId: body.ownerId,
        templateId: template.id,
        accessType: SpaceAccessType.PASSWORD,
        accessSecret: body.accessSecret,
        status: SpaceStatus.ACTIVE,
      },
      select: {
        id: true,
        name: true,
        inviteCode: true,
        accessType: true,
        createdAt: true,
      },
    })

    // 6. 소유자 멤버십 자동 생성
    await prisma.spaceMember.create({
      data: {
        spaceId: space.id,
        userId: body.ownerId,
        role: "OWNER",
      },
    })

    // 7. 초대 링크 생성
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://space.flow-coder.com"
    const inviteUrl = `${baseUrl}/invite/${space.inviteCode}`

    return NextResponse.json({
      spaceId: space.id,
      name: space.name,
      inviteCode: space.inviteCode,
      inviteUrl,
      accessSecret: body.accessSecret,
      createdAt: space.createdAt,
    }, { status: 201 })
  } catch (error) {
    console.error("[Internal API] Failed to create space:", error)
    return NextResponse.json(
      { error: "Failed to create space" },
      { status: 500 }
    )
  }
}
