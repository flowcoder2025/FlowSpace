/**
 * User Search API
 *
 * GET /api/users/search?email=xxx - 이메일로 사용자 검색
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// ============================================
// Configuration
// ============================================
const IS_DEV = process.env.NODE_ENV === "development"

// ============================================
// GET /api/users/search - 이메일로 사용자 검색
// ============================================
export async function GET(request: NextRequest) {
  try {
    // 인증 확인
    const session = await auth()
    if (!session?.user?.id) {
      // 개발 환경에서도 인증 필요
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 쿼리 파라미터 추출
    const { searchParams } = new URL(request.url)
    const email = searchParams.get("email")

    if (!email) {
      return NextResponse.json(
        { error: "Email parameter is required" },
        { status: 400 }
      )
    }

    // 이메일 형식 검증 (기본)
    if (!email.includes("@") || email.length > 255) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      )
    }

    // 사용자 검색
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

    if (IS_DEV) {
      console.log("[User Search] Found user:", user.email)
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error("[User Search] Failed:", error)
    return NextResponse.json(
      { error: "Failed to search user" },
      { status: 500 }
    )
  }
}
