/**
 * Cron Job: 만료된 게스트 세션 정리
 *
 * - 만료된 세션: expiresAt < 현재 시간
 * - 관련 이벤트 로그는 보존 (통계 분석용)
 *
 * Vercel Cron: 매일 새벽 4시 (KST) 실행 - 메시지 정리 1시간 후
 * 설정: vercel.json에 cron 스케줄 정의
 *
 * @see TASK.md 4.7 - 게스트 세션 만료 처리
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Vercel Cron 인증 키 (환경변수로 설정)
const CRON_SECRET = process.env.CRON_SECRET

// 만료된 세션 외에도, 일정 기간 지난 세션도 정리 (선택적)
// 기본값: 만료 기준만 적용
const ADDITIONAL_BUFFER_DAYS = 0

export async function GET(request: NextRequest) {
  try {
    // 🔒 Cron 인증 (Vercel Cron 또는 수동 호출 시)
    const authHeader = request.headers.get("authorization")

    // Vercel Cron은 자동으로 CRON_SECRET을 Bearer 토큰으로 전송
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
      console.warn("[Cron] Unauthorized session cleanup attempt")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const now = new Date()

    // 만료 기준일 계산 (현재 시간 기준 + 버퍼)
    const cutoffDate = new Date(now)
    cutoffDate.setDate(cutoffDate.getDate() - ADDITIONAL_BUFFER_DAYS)

    // 1️⃣ 만료된 게스트 세션 수 조회 (삭제 전 집계)
    const expiredCount = await prisma.guestSession.count({
      where: {
        expiresAt: { lt: cutoffDate },
      },
    })

    if (expiredCount === 0) {
      console.log("[Cron] Session cleanup: No expired sessions found")
      return NextResponse.json({
        success: true,
        deletedCount: 0,
        message: "정리할 만료 세션이 없습니다",
        timestamp: now.toISOString(),
      })
    }

    // 2️⃣ 만료된 세션 삭제
    // 참고: SpaceEventLog는 guestSessionId를 참조하지만, 외래키 제약이 없으므로
    // 세션 삭제 후에도 이벤트 로그는 보존됨 (orphaned reference)
    const deleteResult = await prisma.guestSession.deleteMany({
      where: {
        expiresAt: { lt: cutoffDate },
      },
    })

    console.log(`[Cron] Session cleanup completed:`)
    console.log(`  - Expired sessions: ${deleteResult.count} deleted`)
    console.log(`  - Cutoff date: ${cutoffDate.toISOString()}`)

    return NextResponse.json({
      success: true,
      deletedCount: deleteResult.count,
      details: {
        cutoffDate: cutoffDate.toISOString(),
        bufferDays: ADDITIONAL_BUFFER_DAYS,
      },
      message: `만료된 게스트 세션 ${deleteResult.count}개 삭제됨`,
      timestamp: now.toISOString(),
    })
  } catch (error) {
    console.error("[Cron] Session cleanup failed:", error)
    return NextResponse.json(
      { error: "Session cleanup failed", details: String(error) },
      { status: 500 }
    )
  }
}

// POST도 허용 (수동 트리거용)
export async function POST(request: NextRequest) {
  return GET(request)
}
