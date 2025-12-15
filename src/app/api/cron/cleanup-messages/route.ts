/**
 * Cron Job: 채팅 메시지 자동 정리
 *
 * 24시간 이상 된 채팅 메시지를 삭제하여 DB 비용 절감
 *
 * Vercel Cron: 매일 새벽 3시 (KST) 실행
 * 설정: vercel.json에 cron 스케줄 정의
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Vercel Cron 인증 키 (환경변수로 설정)
const CRON_SECRET = process.env.CRON_SECRET

// 메시지 보관 기간 (시간)
const MESSAGE_RETENTION_HOURS = 24

export async function GET(request: NextRequest) {
  try {
    // 🔒 Cron 인증 (Vercel Cron 또는 수동 호출 시)
    const authHeader = request.headers.get("authorization")

    // Vercel Cron은 자동으로 CRON_SECRET을 Bearer 토큰으로 전송
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
      console.warn("[Cron] Unauthorized cleanup attempt")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 24시간 전 시간 계산
    const cutoffDate = new Date()
    cutoffDate.setHours(cutoffDate.getHours() - MESSAGE_RETENTION_HOURS)

    // 오래된 메시지 삭제 (하드 삭제)
    const result = await prisma.chatMessage.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    })

    console.log(`[Cron] Deleted ${result.count} messages older than ${MESSAGE_RETENTION_HOURS} hours`)

    return NextResponse.json({
      success: true,
      deletedCount: result.count,
      cutoffDate: cutoffDate.toISOString(),
      message: `${result.count}개의 메시지가 삭제되었습니다.`,
    })
  } catch (error) {
    console.error("[Cron] Cleanup failed:", error)
    return NextResponse.json(
      { error: "Cleanup failed", details: String(error) },
      { status: 500 }
    )
  }
}

// POST도 허용 (수동 트리거용)
export async function POST(request: NextRequest) {
  return GET(request)
}
