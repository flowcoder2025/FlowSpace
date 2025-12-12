/**
 * Space Join API Routes
 *
 * POST /api/spaces/[id]/join - 공간 입장 시 자동 멤버십 생성
 *
 * 동작:
 * - 인증된 사용자: userId로 SpaceMember 조회/생성
 * - 게스트: guestSessionId로 SpaceMember 조회/생성
 * - 이미 존재하면 기존 멤버십 반환
 * - 공간 소유자는 OWNER, 그 외는 PARTICIPANT로 생성
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { SpaceRole, ChatRestriction } from "@prisma/client"

// ============================================
// Configuration
// ============================================
const IS_DEV = process.env.NODE_ENV === "development"

// ============================================
// Types
// ============================================
interface RouteParams {
  params: Promise<{ id: string }>
}

interface JoinBody {
  guestSessionToken?: string // 게스트 세션 토큰 (sessionToken으로 조회)
}

interface MembershipResponse {
  id: string
  spaceId: string
  userId: string | null
  guestSessionId: string | null
  role: SpaceRole
  restriction: ChatRestriction
  restrictedUntil: Date | null
  isNew: boolean
}

// ============================================
// POST /api/spaces/[id]/join - 멤버십 생성/조회
// ============================================
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: spaceId } = await params

    // ID 형식 검증
    if (!spaceId || spaceId.length > 100) {
      return NextResponse.json(
        { error: "Invalid space ID" },
        { status: 400 }
      )
    }

    // 공간 존재 확인 및 소유자 정보 조회
    const space = await prisma.space.findUnique({
      where: { id: spaceId, deletedAt: null },
      select: {
        id: true,
        name: true,
        ownerId: true,
        status: true,
      },
    })

    if (!space) {
      return NextResponse.json(
        { error: "Space not found" },
        { status: 404 }
      )
    }

    if (space.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Space is not active" },
        { status: 403 }
      )
    }

    // 인증 확인
    const session = await auth()
    const userId = session?.user?.id

    // Request body 파싱 (게스트인 경우)
    let body: JoinBody = {}
    try {
      body = await request.json()
    } catch {
      // body가 없거나 파싱 실패해도 인증된 사용자면 진행 가능
    }

    // 인증된 사용자도 아니고 게스트 세션도 없으면 에러
    if (!userId && !body.guestSessionToken) {
      return NextResponse.json(
        { error: "Authentication required. Please login or provide guestSessionToken" },
        { status: 401 }
      )
    }

    let membership: MembershipResponse

    if (userId) {
      // ================================
      // 인증된 사용자 처리
      // ================================
      const existingMember = await prisma.spaceMember.findUnique({
        where: {
          spaceId_userId: {
            spaceId,
            userId,
          },
        },
      })

      if (existingMember) {
        // 기존 멤버십 반환
        membership = {
          id: existingMember.id,
          spaceId: existingMember.spaceId,
          userId: existingMember.userId,
          guestSessionId: existingMember.guestSessionId,
          role: existingMember.role,
          restriction: existingMember.restriction,
          restrictedUntil: existingMember.restrictedUntil,
          isNew: false,
        }

        if (IS_DEV) {
          console.log("[Join API] Existing membership found:", userId, "role:", existingMember.role)
        }
      } else {
        // 새 멤버십 생성
        // 공간 소유자인 경우 OWNER, 그 외 PARTICIPANT
        const role = space.ownerId === userId ? SpaceRole.OWNER : SpaceRole.PARTICIPANT

        const newMember = await prisma.spaceMember.create({
          data: {
            spaceId,
            userId,
            role,
            restriction: ChatRestriction.NONE,
          },
        })

        membership = {
          id: newMember.id,
          spaceId: newMember.spaceId,
          userId: newMember.userId,
          guestSessionId: newMember.guestSessionId,
          role: newMember.role,
          restriction: newMember.restriction,
          restrictedUntil: newMember.restrictedUntil,
          isNew: true,
        }

        if (IS_DEV) {
          console.log("[Join API] New membership created:", userId, "role:", role)
        }
      }
    } else {
      // ================================
      // 게스트 사용자 처리
      // ================================
      const guestSessionToken = body.guestSessionToken!

      // 게스트 세션 유효성 확인 (sessionToken으로 조회)
      const guestSession = await prisma.guestSession.findUnique({
        where: { sessionToken: guestSessionToken },
        select: { id: true, spaceId: true, expiresAt: true },
      })

      if (!guestSession) {
        return NextResponse.json(
          { error: "Invalid guest session" },
          { status: 401 }
        )
      }

      // 세션 만료 확인
      if (guestSession.expiresAt < new Date()) {
        return NextResponse.json(
          { error: "Guest session expired" },
          { status: 401 }
        )
      }

      // 게스트 세션이 해당 공간용인지 확인
      if (guestSession.spaceId !== spaceId) {
        return NextResponse.json(
          { error: "Guest session does not belong to this space" },
          { status: 403 }
        )
      }

      // guestSession.id를 사용하여 멤버십 조회/생성
      const guestSessionId = guestSession.id

      const existingMember = await prisma.spaceMember.findUnique({
        where: {
          spaceId_guestSessionId: {
            spaceId,
            guestSessionId,
          },
        },
      })

      if (existingMember) {
        // 기존 멤버십 반환
        membership = {
          id: existingMember.id,
          spaceId: existingMember.spaceId,
          userId: existingMember.userId,
          guestSessionId: existingMember.guestSessionId,
          role: existingMember.role,
          restriction: existingMember.restriction,
          restrictedUntil: existingMember.restrictedUntil,
          isNew: false,
        }

        if (IS_DEV) {
          console.log("[Join API] Existing guest membership found:", guestSessionId)
        }
      } else {
        // 새 게스트 멤버십 생성 (항상 PARTICIPANT)
        const newMember = await prisma.spaceMember.create({
          data: {
            spaceId,
            guestSessionId,
            role: SpaceRole.PARTICIPANT,
            restriction: ChatRestriction.NONE,
          },
        })

        membership = {
          id: newMember.id,
          spaceId: newMember.spaceId,
          userId: newMember.userId,
          guestSessionId: newMember.guestSessionId,
          role: newMember.role,
          restriction: newMember.restriction,
          restrictedUntil: newMember.restrictedUntil,
          isNew: true,
        }

        if (IS_DEV) {
          console.log("[Join API] New guest membership created:", guestSessionId)
        }
      }
    }

    return NextResponse.json({
      membership,
      space: {
        id: space.id,
        name: space.name,
      },
    })
  } catch (error) {
    console.error("[Join API] Failed to process join:", error)
    return NextResponse.json(
      { error: "Failed to process join request" },
      { status: 500 }
    )
  }
}
