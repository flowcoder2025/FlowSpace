/**
 * 녹화 동의 API
 * POST /api/user/consent
 *
 * 법적 준수: 개인정보보호법 제22조 동의 기록
 */

import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  try {
    // 1. 인증 확인
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "인증이 필요합니다" },
        { status: 401 }
      )
    }

    // 2. 요청 바디 파싱
    const body = await request.json()
    const { agreedToRecording } = body

    if (typeof agreedToRecording !== "boolean") {
      return NextResponse.json(
        { error: "동의 여부가 필요합니다" },
        { status: 400 }
      )
    }

    // 3. 동의 기록 업데이트
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        agreedToRecording,
        agreedToRecordingAt: agreedToRecording ? new Date() : null,
      },
      select: {
        id: true,
        agreedToRecording: true,
        agreedToRecordingAt: true,
      },
    })

    // 4. 응답
    return NextResponse.json({
      success: true,
      user: updatedUser,
    })
  } catch (error) {
    console.error("[API] Consent error:", error)
    return NextResponse.json(
      { error: "동의 처리 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}

// GET: 현재 동의 상태 조회
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "인증이 필요합니다" },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        agreedToRecording: true,
        agreedToRecordingAt: true,
      },
    })

    return NextResponse.json({
      agreedToRecording: user?.agreedToRecording ?? false,
      agreedToRecordingAt: user?.agreedToRecordingAt ?? null,
    })
  } catch (error) {
    console.error("[API] Get consent error:", error)
    return NextResponse.json(
      { error: "동의 상태 조회 중 오류가 발생했습니다" },
      { status: 500 }
    )
  }
}
