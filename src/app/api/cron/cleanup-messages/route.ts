/**
 * Cron Job: 채팅 메시지 자동 정리
 *
 * - 일반 메시지: 24시간 후 삭제 (DB 비용 절감)
 * - 귓속말: 3개월(90일) 후 삭제 (개인 대화 보존)
 *
 * Vercel Cron: 매일 새벽 3시 (KST) 실행
 * 설정: vercel.json에 cron 스케줄 정의
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Vercel Cron 인증 키 (환경변수로 설정)
const CRON_SECRET = process.env.CRON_SECRET

// 메시지 보관 기간
const MESSAGE_RETENTION_HOURS = 24         // 일반 메시지: 24시간
const WHISPER_RETENTION_DAYS = 90          // 귓속말: 90일 (3개월)

export async function GET(request: NextRequest) {
  try {
    // 🔒 Cron 인증 (Vercel Cron 또는 수동 호출 시)
    const authHeader = request.headers.get("authorization")

    // Vercel Cron은 자동으로 CRON_SECRET을 Bearer 토큰으로 전송
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
      console.warn("[Cron] Unauthorized cleanup attempt")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // 📬 일반 메시지: 24시간 전 기준
    const messageCutoffDate = new Date()
    messageCutoffDate.setHours(messageCutoffDate.getHours() - MESSAGE_RETENTION_HOURS)

    // 🔒 귓속말: 90일 전 기준
    const whisperCutoffDate = new Date()
    whisperCutoffDate.setDate(whisperCutoffDate.getDate() - WHISPER_RETENTION_DAYS)

    // 1️⃣ 일반 메시지 삭제 (WHISPER 제외)
    const messageResult = await prisma.chatMessage.deleteMany({
      where: {
        type: { not: "WHISPER" },
        createdAt: { lt: messageCutoffDate },
      },
    })

    // 2️⃣ 귓속말 삭제 (3개월 이상)
    const whisperResult = await prisma.chatMessage.deleteMany({
      where: {
        type: "WHISPER",
        createdAt: { lt: whisperCutoffDate },
      },
    })

    const totalDeleted = messageResult.count + whisperResult.count

    console.log(`[Cron] Cleanup completed:`)
    console.log(`  - Messages (24h): ${messageResult.count} deleted`)
    console.log(`  - Whispers (90d): ${whisperResult.count} deleted`)

    return NextResponse.json({
      success: true,
      deletedCount: totalDeleted,
      breakdown: {
        messages: {
          count: messageResult.count,
          retentionHours: MESSAGE_RETENTION_HOURS,
          cutoffDate: messageCutoffDate.toISOString(),
        },
        whispers: {
          count: whisperResult.count,
          retentionDays: WHISPER_RETENTION_DAYS,
          cutoffDate: whisperCutoffDate.toISOString(),
        },
      },
      message: `일반 메시지 ${messageResult.count}개, 귓속말 ${whisperResult.count}개 삭제됨`,
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
