/**
 * User Search API
 *
 * GET /api/users/search?q=xxx - 이메일 또는 이름으로 사용자 검색
 * GET /api/users/search?email=xxx - 이메일로 사용자 검색 (정확 일치)
 * GET /api/users/search?q=xxx&spaceId=xxx - 공간 내 displayName도 포함 검색
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// ============================================
// Configuration
// ============================================
const IS_DEV = process.env.NODE_ENV === "development"
const MAX_RESULTS = 20

// ============================================
// GET /api/users/search - 사용자 검색
// ============================================
export async function GET(request: NextRequest) {
  try {
    // 인증 확인
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 쿼리 파라미터 추출
    const { searchParams } = new URL(request.url)
    const email = searchParams.get("email")
    const query = searchParams.get("q")
    const spaceId = searchParams.get("spaceId")
    const limit = Math.min(
      parseInt(searchParams.get("limit") || "10", 10),
      MAX_RESULTS
    )

    // 정확한 이메일 검색 (기존 동작 유지)
    if (email) {
      if (!email.includes("@") || email.length > 255) {
        return NextResponse.json(
          { error: "Invalid email format" },
          { status: 400 }
        )
      }

      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      })

      if (!user) {
        return NextResponse.json(
          { error: "User not found" },
          { status: 404 }
        )
      }

      return NextResponse.json({ user, users: [user] })
    }

    // 검색어 기반 검색
    if (!query || query.length < 2) {
      return NextResponse.json(
        { error: "Search query must be at least 2 characters" },
        { status: 400 }
      )
    }

    // 공간 내 displayName 검색 (spaceId가 제공된 경우)
    let spaceMemberResults: {
      userId: string | null
      displayName: string | null
      user: {
        id: string
        name: string | null
        email: string
        image: string | null
      } | null
    }[] = []

    if (spaceId) {
      spaceMemberResults = await prisma.spaceMember.findMany({
        where: {
          spaceId,
          userId: { not: null },
          displayName: {
            contains: query,
            mode: "insensitive",
          },
        },
        select: {
          userId: true,
          displayName: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
        take: limit,
      })
    }

    // 사용자 이름/이메일 검색
    const userResults = await prisma.user.findMany({
      where: {
        OR: [
          {
            email: {
              contains: query,
              mode: "insensitive",
            },
          },
          {
            name: {
              contains: query,
              mode: "insensitive",
            },
          },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
      },
      take: limit,
    })

    // 결과 병합 및 중복 제거
    const userMap = new Map<
      string,
      {
        id: string
        name: string | null
        email: string
        image: string | null
        displayName?: string | null
        matchedBy: "email" | "name" | "displayName"
      }
    >()

    // SpaceMember displayName 매칭 먼저 추가
    for (const sm of spaceMemberResults) {
      if (sm.userId && sm.user) {
        userMap.set(sm.userId, {
          ...sm.user,
          displayName: sm.displayName,
          matchedBy: "displayName",
        })
      }
    }

    // User 검색 결과 추가 (중복 시 업데이트)
    for (const user of userResults) {
      const existing = userMap.get(user.id)
      if (!existing) {
        const matchedBy = user.email.toLowerCase().includes(query.toLowerCase())
          ? "email"
          : "name"
        userMap.set(user.id, {
          ...user,
          matchedBy,
        })
      }
    }

    const users = Array.from(userMap.values()).slice(0, limit)

    if (IS_DEV) {
      console.log(`[User Search] Query: "${query}", Results: ${users.length}`)
    }

    return NextResponse.json({
      users,
      totalCount: users.length,
      query,
      spaceId: spaceId || null,
    })
  } catch (error) {
    console.error("[User Search] Failed:", error)
    return NextResponse.json(
      { error: "Failed to search user" },
      { status: 500 }
    )
  }
}
