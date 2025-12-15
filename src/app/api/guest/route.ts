/**
 * Guest Session API Routes
 *
 * POST /api/guest - 게스트 세션 생성 (입장)
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { SpaceAccessType, SpaceEventType } from "@prisma/client"

// ============================================
// Types
// ============================================
interface CreateGuestSessionBody {
  spaceId: string
  nickname: string
  avatar?: string
  password?: string // PASSWORD 타입 공간용
}

// 세션 만료 시간 (24시간)
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000

// ============================================
// POST /api/guest - 게스트 세션 생성
// ============================================
export async function POST(request: NextRequest) {
  try {
    const body: CreateGuestSessionBody = await request.json()

    // 공간 조회
    const space = await prisma.space.findUnique({
      where: { id: body.spaceId, deletedAt: null },
    })

    if (!space) {
      return NextResponse.json({ error: "Space not found" }, { status: 404 })
    }

    // 비공개 공간 체크
    if (space.accessType === SpaceAccessType.PRIVATE) {
      return NextResponse.json(
        { error: "This space is private" },
        { status: 403 }
      )
    }

    // 암호 공간 체크
    if (space.accessType === SpaceAccessType.PASSWORD) {
      if (!body.password || body.password !== space.accessSecret) {
        return NextResponse.json(
          { error: "Invalid password" },
          { status: 401 }
        )
      }
    }

    // 닉네임 유효성 검사
    const trimmedNickname = body.nickname?.trim()
    if (!trimmedNickname) {
      return NextResponse.json(
        { error: "닉네임을 입력해주세요" },
        { status: 400 }
      )
    }
    if (trimmedNickname.includes(" ") || /\s/.test(trimmedNickname)) {
      return NextResponse.json(
        { error: "닉네임에 띄어쓰기를 사용할 수 없습니다" },
        { status: 400 }
      )
    }
    if (trimmedNickname.length < 2 || trimmedNickname.length > 20) {
      return NextResponse.json(
        { error: "닉네임은 2~20자 사이로 입력해주세요" },
        { status: 400 }
      )
    }

    // 닉네임 중복 체크 (같은 공간 내 활성 세션)
    const existingSession = await prisma.guestSession.findFirst({
      where: {
        spaceId: body.spaceId,
        nickname: trimmedNickname,
        expiresAt: { gt: new Date() },
      },
    })

    let finalNickname = trimmedNickname
    if (existingSession) {
      // 닉네임에 랜덤 숫자 suffix 추가
      const suffix = Math.floor(Math.random() * 9000) + 1000
      finalNickname = `${trimmedNickname}#${suffix}`
    }

    // 현재 접속자 수 체크
    const currentUsers = await prisma.guestSession.count({
      where: {
        spaceId: body.spaceId,
        expiresAt: { gt: new Date() },
      },
    })

    if (currentUsers >= space.maxUsers) {
      return NextResponse.json(
        { error: "Space is full" },
        { status: 403 }
      )
    }

    // 게스트 세션 생성
    const guestSession = await prisma.guestSession.create({
      data: {
        spaceId: body.spaceId,
        nickname: finalNickname,
        avatar: body.avatar ?? "default",
        expiresAt: new Date(Date.now() + SESSION_DURATION_MS),
      },
    })

    // 입장 이벤트 로그 기록
    await prisma.spaceEventLog.create({
      data: {
        spaceId: body.spaceId,
        guestSessionId: guestSession.id,
        eventType: SpaceEventType.ENTER,
        payload: {
          nickname: finalNickname,
          avatar: guestSession.avatar,
        },
      },
    })

    return NextResponse.json(
      {
        sessionToken: guestSession.sessionToken,
        nickname: finalNickname,
        avatar: guestSession.avatar,
        expiresAt: guestSession.expiresAt,
        spaceId: body.spaceId,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Failed to create guest session:", error)
    return NextResponse.json(
      { error: "Failed to create guest session" },
      { status: 500 }
    )
  }
}
