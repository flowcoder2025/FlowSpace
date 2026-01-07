/**
 * Guest Session API Routes
 *
 * POST /api/guest - 게스트 세션 생성 (입장)
 */

import { NextRequest, NextResponse } from "next/server"
import { randomBytes } from "crypto"
import { prisma } from "@/lib/prisma"
import { SpaceAccessType, SpaceEventType } from "@prisma/client"

// 📊 Phase 2.9: 강력한 랜덤 suffix 생성 (6자리 영숫자, 약 22억 경우의 수)
function generateSecureRandomSuffix(): string {
  const chars = "0123456789ABCDEFGHJKLMNPQRSTUVWXYZ" // 혼동 문자 제외 (I, O)
  const bytes = randomBytes(6)
  let result = ""
  for (const byte of bytes) {
    result += chars[byte % chars.length]
  }
  return result
}

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
      // 📊 Phase 2.9: 강력한 랜덤 suffix 추가 (crypto 기반)
      const suffix = generateSecureRandomSuffix()
      finalNickname = `${trimmedNickname}#${suffix}`
    }

    // 📊 Phase 3.16: 트랜잭션으로 원자적 처리 (race condition 방지)
    // 접속자 수 체크와 세션 생성을 하나의 트랜잭션으로 묶음
    const guestSession = await prisma.$transaction(async (tx) => {
      // 현재 접속자 수 체크
      const currentUsers = await tx.guestSession.count({
        where: {
          spaceId: body.spaceId,
          expiresAt: { gt: new Date() },
        },
      })

      if (currentUsers >= space.maxUsers) {
        throw new Error("SPACE_FULL")
      }

      // 게스트 세션 생성
      return await tx.guestSession.create({
        data: {
          spaceId: body.spaceId,
          nickname: finalNickname,
          avatar: body.avatar ?? "default",
          expiresAt: new Date(Date.now() + SESSION_DURATION_MS),
        },
      })
    }).catch((error) => {
      if (error.message === "SPACE_FULL") {
        return null // 공간 가득 참 표시
      }
      throw error // 다른 에러는 재발생
    })

    // 공간 가득 참 처리
    if (!guestSession) {
      return NextResponse.json(
        { error: "Space is full" },
        { status: 403 }
      )
    }

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
