/**
 * Space Map Objects API Routes
 *
 * GET /api/spaces/[id]/objects - 공간의 맵 오브젝트 목록 조회
 * POST /api/spaces/[id]/objects - 맵 오브젝트 배치
 * DELETE /api/spaces/[id]/objects - 맵 오브젝트 삭제
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { SenderType, Prisma } from "@prisma/client"
import { canManageSpace } from "@/lib/space-auth"
import {
  IS_DEV,
  getUserIdFromSession,
  validateId,
  invalidIdResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
} from "@/lib/api-helpers"

// ============================================
// Types
// ============================================
interface RouteParams {
  params: Promise<{ id: string }>
}

interface CreateObjectBody {
  assetId: string
  positionX: number
  positionY: number
  rotation?: number
  linkedObjectId?: string
  customData?: Record<string, unknown>
  sessionToken?: string // 게스트 세션 토큰
}

interface DeleteObjectBody {
  objectId: string
  sessionToken?: string
}

// ============================================
// GET /api/spaces/[id]/objects - 맵 오브젝트 목록 조회
// ============================================
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: spaceId } = await params

    if (!validateId(spaceId)) {
      return invalidIdResponse("space ID")
    }

    // 공간 존재 여부 확인
    const space = await prisma.space.findUnique({
      where: { id: spaceId, deletedAt: null },
      select: { id: true },
    })

    if (!space) {
      return notFoundResponse("Space")
    }

    // 맵 오브젝트 조회
    const objects = await prisma.mapObject.findMany({
      where: { spaceId },
      orderBy: { createdAt: "asc" },
    })

    if (IS_DEV) {
      console.log(`[Objects API] GET: ${objects.length} objects for space ${spaceId}`)
    }

    return NextResponse.json({ objects })
  } catch (error) {
    console.error("Failed to fetch map objects:", error)
    return NextResponse.json(
      { error: "Failed to fetch map objects" },
      { status: 500 }
    )
  }
}

// ============================================
// POST /api/spaces/[id]/objects - 맵 오브젝트 배치
// ============================================
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: spaceId } = await params

    if (!validateId(spaceId)) {
      return invalidIdResponse("space ID")
    }

    // 인증 확인
    const userId = await getUserIdFromSession(true)
    if (!userId) {
      return unauthorizedResponse()
    }

    // 접근 권한 확인 (space-auth.ts의 통합 함수 사용)
    const allowed = await canManageSpace(userId, spaceId)
    if (!allowed) {
      return forbiddenResponse("Only owner or staff can place objects")
    }

    // Request body 파싱
    const body: CreateObjectBody = await request.json()

    // 입력값 검증
    if (!body.assetId || typeof body.assetId !== "string") {
      return NextResponse.json({ error: "assetId is required" }, { status: 400 })
    }

    if (typeof body.positionX !== "number" || typeof body.positionY !== "number") {
      return NextResponse.json({ error: "positionX and positionY are required" }, { status: 400 })
    }

    // 중복 위치 확인
    const existingObject = await prisma.mapObject.findFirst({
      where: {
        spaceId,
        positionX: body.positionX,
        positionY: body.positionY,
      },
    })

    if (existingObject) {
      return NextResponse.json(
        { error: "Object already exists at this position" },
        { status: 409 }
      )
    }

    // 오브젝트 생성
    const newObject = await prisma.mapObject.create({
      data: {
        spaceId,
        assetId: body.assetId,
        positionX: body.positionX,
        positionY: body.positionY,
        rotation: body.rotation ?? 0,
        linkedObjectId: body.linkedObjectId,
        customData: (body.customData ?? {}) as Prisma.InputJsonValue,
        placedBy: userId,
        placedByType: SenderType.USER,
      },
    })

    if (IS_DEV) {
      console.log(`[Objects API] POST: Created object ${newObject.id} at (${body.positionX}, ${body.positionY})`)
    }

    return NextResponse.json({ object: newObject }, { status: 201 })
  } catch (error) {
    console.error("Failed to create map object:", error)
    return NextResponse.json(
      { error: "Failed to create map object" },
      { status: 500 }
    )
  }
}

// ============================================
// DELETE /api/spaces/[id]/objects - 맵 오브젝트 삭제
// ============================================
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: spaceId } = await params

    if (!validateId(spaceId)) {
      return invalidIdResponse("space ID")
    }

    // 인증 확인
    const userId = await getUserIdFromSession(true)
    if (!userId) {
      return unauthorizedResponse()
    }

    // 접근 권한 확인
    const allowed = await canManageSpace(userId, spaceId)
    if (!allowed) {
      return forbiddenResponse("Only owner or staff can delete objects")
    }

    // Request body 파싱
    const body: DeleteObjectBody = await request.json()

    if (!body.objectId || typeof body.objectId !== "string") {
      return NextResponse.json({ error: "objectId is required" }, { status: 400 })
    }

    // 오브젝트 존재 확인
    const object = await prisma.mapObject.findFirst({
      where: {
        id: body.objectId,
        spaceId,
      },
    })

    if (!object) {
      return NextResponse.json({ error: "Object not found" }, { status: 404 })
    }

    // 연결된 오브젝트 링크 해제
    if (object.linkedObjectId) {
      await prisma.mapObject.update({
        where: { id: object.linkedObjectId },
        data: { linkedObjectId: null },
      })
    }

    // 오브젝트 삭제
    await prisma.mapObject.delete({
      where: { id: body.objectId },
    })

    if (IS_DEV) {
      console.log(`[Objects API] DELETE: Removed object ${body.objectId}`)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to delete map object:", error)
    return NextResponse.json(
      { error: "Failed to delete map object" },
      { status: 500 }
    )
  }
}

// ============================================
// PATCH /api/spaces/[id]/objects - 맵 오브젝트 업데이트 (링크 연결 등)
// ============================================
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: spaceId } = await params

    if (!validateId(spaceId)) {
      return invalidIdResponse("space ID")
    }

    // 인증 확인
    const userId = await getUserIdFromSession(true)
    if (!userId) {
      return unauthorizedResponse()
    }

    // 접근 권한 확인
    const allowed = await canManageSpace(userId, spaceId)
    if (!allowed) {
      return forbiddenResponse()
    }

    // Request body 파싱
    const body = await request.json()

    if (!body.objectId || typeof body.objectId !== "string") {
      return NextResponse.json({ error: "objectId is required" }, { status: 400 })
    }

    // 오브젝트 존재 확인
    const object = await prisma.mapObject.findFirst({
      where: {
        id: body.objectId,
        spaceId,
      },
    })

    if (!object) {
      return NextResponse.json({ error: "Object not found" }, { status: 404 })
    }

    // 업데이트 데이터 구성
    const updateData: Record<string, unknown> = {}

    if (body.linkedObjectId !== undefined) {
      updateData.linkedObjectId = body.linkedObjectId
    }
    if (body.rotation !== undefined) {
      updateData.rotation = body.rotation
    }
    if (body.customData !== undefined) {
      updateData.customData = body.customData
    }

    // 오브젝트 업데이트
    const updatedObject = await prisma.mapObject.update({
      where: { id: body.objectId },
      data: updateData,
    })

    if (IS_DEV) {
      console.log(`[Objects API] PATCH: Updated object ${body.objectId}`)
    }

    return NextResponse.json({ object: updatedObject })
  } catch (error) {
    console.error("Failed to update map object:", error)
    return NextResponse.json(
      { error: "Failed to update map object" },
      { status: 500 }
    )
  }
}
