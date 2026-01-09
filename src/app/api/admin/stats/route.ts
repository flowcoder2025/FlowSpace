/**
 * Admin Dashboard Stats API
 *
 * GET /api/admin/stats
 * Returns aggregated statistics for admin dashboard
 *
 * 🔒 SuperAdmin 전용 API (Phase 2)
 *
 * ⚡ Performance Optimized (2025-12-09):
 * - Promise.all()로 독립 쿼리 병렬 실행
 * - 재방문율 계산 DB 집계 사용 (메모리 로드 최소화)
 */

import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { isSuperAdmin } from "@/lib/space-auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id

    // 🔒 SuperAdmin 권한 확인
    const isAdmin = await isSuperAdmin(userId)
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden: SuperAdmin only" }, { status: 403 })
    }

    // 🔓 SuperAdmin은 모든 공간의 통계를 볼 수 있음
    const spaces = await prisma.space.findMany({
      where: { deletedAt: null },
      select: { id: true },
    })
    const spaceIds = spaces.map((s) => s.id)

    // 📊 Phase 3.4: 공간 없을 때 전체 필드 명시적 반환
    if (spaceIds.length === 0) {
      return NextResponse.json({
        totalVisitors: 0,
        peakConcurrent: 0,
        avgDuration: 0,
        returnRate: 0,
        weeklyChange: {
          visitors: 0,
          duration: 0,
          returnRate: 0,
        },
        // 📊 데이터 품질 지표도 포함
        dataQuality: {
          incompleteEnterSessions: 0,
          incompleteExitSessions: 0,
          completedSessions: 0,
          outlierSessions: 0,
          outlierAvgDuration: 0,
        },
      })
    }

    // Date ranges
    const now = new Date()
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

    // ⚡ 3.2 최적화: 18개 쿼리 → 10개로 통합 (2026-01-09)
    // ENTER/EXIT 이벤트는 2주간 전체를 한 번에 조회 후 메모리에서 필터링
    const [
      guestVisitors,
      authVisitors,
      thisWeekGuestVisitors,
      lastWeekGuestVisitors,
      // 통합 쿼리: 2주간 모든 ENTER/EXIT 이벤트
      allEnterEvents,
      allExitEvents,
      // groupBy 쿼리 (인덱스 최적화됨)
      guestReturnRateData,
      authReturnRateData,
    ] = await Promise.all([
      // 1. Total guest visitors (unique guest sessions)
      prisma.guestSession.count({
        where: { spaceId: { in: spaceIds } },
      }),

      // 1b. Total auth visitors (unique userIds with ENTER events)
      prisma.spaceEventLog.groupBy({
        by: ["userId"],
        where: {
          spaceId: { in: spaceIds },
          eventType: "ENTER",
          userId: { not: null },
        },
      }),

      // 2. This week's guest visitors
      prisma.guestSession.count({
        where: {
          spaceId: { in: spaceIds },
          createdAt: { gte: oneWeekAgo },
        },
      }),

      // 3. Last week's guest visitors
      prisma.guestSession.count({
        where: {
          spaceId: { in: spaceIds },
          createdAt: { gte: twoWeeksAgo, lt: oneWeekAgo },
        },
      }),

      // ⚡ 통합: 2주간 모든 ENTER 이벤트 (기존 8개 쿼리 → 1개)
      prisma.spaceEventLog.findMany({
        where: {
          spaceId: { in: spaceIds },
          eventType: "ENTER",
          createdAt: { gte: twoWeeksAgo },
        },
        select: { createdAt: true, guestSessionId: true, userId: true },
        orderBy: { createdAt: "asc" },
      }),

      // ⚡ 통합: 2주간 모든 EXIT 이벤트 (기존 8개 쿼리 → 1개)
      prisma.spaceEventLog.findMany({
        where: {
          spaceId: { in: spaceIds },
          eventType: "EXIT",
          createdAt: { gte: twoWeeksAgo },
        },
        select: { createdAt: true, guestSessionId: true, userId: true },
        orderBy: { createdAt: "asc" },
      }),

      // 7. Guest 재방문율 계산 (인덱스: spaceId, eventType, guestSessionId)
      prisma.spaceEventLog.groupBy({
        by: ["guestSessionId"],
        where: {
          spaceId: { in: spaceIds },
          eventType: "ENTER",
          guestSessionId: { not: null },
        },
        _count: true,
      }),

      // 7b. Auth 재방문율 계산 (인덱스: spaceId, eventType, userId)
      prisma.spaceEventLog.groupBy({
        by: ["userId"],
        where: {
          spaceId: { in: spaceIds },
          eventType: "ENTER",
          userId: { not: null },
        },
        _count: true,
      }),
    ])

    // ⚡ 메모리 필터링: 통합된 이벤트를 날짜/사용자유형별로 분류
    const oneWeekAgoTime = oneWeekAgo.getTime()

    // 이번 주 이벤트 필터
    const enterEventsForPeak = allEnterEvents.filter(
      (e) => e.createdAt.getTime() >= oneWeekAgoTime
    )
    const exitEventsForPeak = allExitEvents.filter(
      (e) => e.createdAt.getTime() >= oneWeekAgoTime
    )

    // 이번 주 체류시간용 (게스트/인증 분리)
    const guestEnterLogs = enterEventsForPeak.filter((e) => e.guestSessionId)
    const guestExitLogs = exitEventsForPeak.filter((e) => e.guestSessionId)
    const authEnterLogs = enterEventsForPeak.filter((e) => e.userId)
    const authExitLogs = exitEventsForPeak.filter((e) => e.userId)

    // 지난 주 체류시간용
    const lastWeekGuestEnterLogs = allEnterEvents.filter(
      (e) => e.guestSessionId && e.createdAt.getTime() < oneWeekAgoTime
    )
    const lastWeekGuestExitLogs = allExitEvents.filter(
      (e) => e.guestSessionId && e.createdAt.getTime() < oneWeekAgoTime
    )
    const lastWeekAuthEnterLogs = allEnterEvents.filter(
      (e) => e.userId && e.createdAt.getTime() < oneWeekAgoTime
    )
    const lastWeekAuthExitLogs = allExitEvents.filter(
      (e) => e.userId && e.createdAt.getTime() < oneWeekAgoTime
    )

    // 이번 주/지난 주 인증 사용자 수 계산 (메모리에서)
    const thisWeekAuthUserIds = new Set(
      enterEventsForPeak.filter((e) => e.userId).map((e) => e.userId)
    )
    const lastWeekAuthUserIds = new Set(
      allEnterEvents
        .filter((e) => e.userId && e.createdAt.getTime() < oneWeekAgoTime)
        .map((e) => e.userId)
    )
    const thisWeekAuthVisitors = { length: thisWeekAuthUserIds.size }
    const lastWeekAuthVisitors = { length: lastWeekAuthUserIds.size }

    // 📊 합산: 게스트 + 인증 사용자
    const totalVisitors = guestVisitors + authVisitors.length
    const thisWeekVisitors = thisWeekGuestVisitors + thisWeekAuthVisitors.length
    const lastWeekVisitors = lastWeekGuestVisitors + lastWeekAuthVisitors.length

    // Calculate weekly change for visitors
    const visitorChange =
      lastWeekVisitors > 0
        ? Math.round(((thisWeekVisitors - lastWeekVisitors) / lastWeekVisitors) * 100)
        : thisWeekVisitors > 0
          ? 100
          : 0

    // 📊 피크 동접 계산: ENTER/EXIT 이벤트로 실제 동시접속자 추적
    // 1. 모든 이벤트를 시간순으로 정렬 (ENTER: +1, EXIT: -1)
    interface ConcurrencyEvent {
      time: Date
      delta: number  // +1 for ENTER, -1 for EXIT
      participantKey: string  // guestSessionId 또는 userId
    }

    const concurrencyEvents: ConcurrencyEvent[] = []
    // 📊 Phase 3.3: null 이벤트 카운트 (데이터 품질 모니터링)
    let nullIdentifierEvents = 0

    // ENTER 이벤트 추가
    enterEventsForPeak.forEach((e) => {
      // 📊 Phase 3.3: null 처리 명시화 - guestSessionId와 userId 둘 다 없는 경우 로깅
      if (!e.guestSessionId && !e.userId) {
        nullIdentifierEvents++
        return // 스킵
      }
      const key = e.guestSessionId || e.userId!
      concurrencyEvents.push({ time: e.createdAt, delta: 1, participantKey: key })
    })

    // EXIT 이벤트 추가
    exitEventsForPeak.forEach((e) => {
      // 📊 Phase 3.3: null 처리 명시화
      if (!e.guestSessionId && !e.userId) {
        nullIdentifierEvents++
        return // 스킵
      }
      const key = e.guestSessionId || e.userId!
      concurrencyEvents.push({ time: e.createdAt, delta: -1, participantKey: key })
    })

    // 📊 Phase 3.3: null 이벤트 로깅 (데이터 품질 문제 감지용)
    if (nullIdentifierEvents > 0) {
      console.warn(`[Admin Stats] ⚠️ ${nullIdentifierEvents} events have null guestSessionId AND null userId`)
    }

    // 시간순 정렬
    concurrencyEvents.sort((a, b) => a.time.getTime() - b.time.getTime())

    // 2. 피크 동접 계산 (참가자 Set으로 중복 제거)
    const activeParticipants = new Set<string>()
    let peakConcurrent = 0

    concurrencyEvents.forEach((event) => {
      if (event.delta > 0) {
        activeParticipants.add(event.participantKey)
      } else {
        activeParticipants.delete(event.participantKey)
      }
      peakConcurrent = Math.max(peakConcurrent, activeParticipants.size)
    })

    // Calculate durations from ENTER/EXIT pairs (개선된 알고리즘)
    // 각 세션/사용자별로 ENTER-EXIT 쌍을 시간순으로 매칭
    const durations: number[] = []           // 정상 체류시간 (24시간 미만)
    const outlierDurations: number[] = []    // 📊 이상치 체류시간 (24시간 이상)
    const MAX_DURATION_MS = 24 * 60 * 60 * 1000 // 24시간

    // 게스트: guestSessionId별로 이벤트 그룹화
    const guestEventsBySession = new Map<string, { enters: Date[]; exits: Date[] }>()

    guestEnterLogs.forEach((log) => {
      if (log.guestSessionId) {
        if (!guestEventsBySession.has(log.guestSessionId)) {
          guestEventsBySession.set(log.guestSessionId, { enters: [], exits: [] })
        }
        guestEventsBySession.get(log.guestSessionId)!.enters.push(log.createdAt)
      }
    })

    guestExitLogs.forEach((log) => {
      if (log.guestSessionId) {
        if (!guestEventsBySession.has(log.guestSessionId)) {
          guestEventsBySession.set(log.guestSessionId, { enters: [], exits: [] })
        }
        guestEventsBySession.get(log.guestSessionId)!.exits.push(log.createdAt)
      }
    })

    // 각 세션별로 ENTER-EXIT 쌍 매칭 (시간순)
    guestEventsBySession.forEach((events) => {
      const enters = events.enters.sort((a, b) => a.getTime() - b.getTime())
      const exits = events.exits.sort((a, b) => a.getTime() - b.getTime())

      let exitIdx = 0
      enters.forEach((enterTime) => {
        // 해당 ENTER 이후의 첫 번째 EXIT 찾기
        while (exitIdx < exits.length && exits[exitIdx].getTime() <= enterTime.getTime()) {
          exitIdx++
        }
        if (exitIdx < exits.length) {
          const durationMs = exits[exitIdx].getTime() - enterTime.getTime()
          if (durationMs > 0) {
            if (durationMs < MAX_DURATION_MS) {
              durations.push(durationMs)
            } else {
              // 📊 24시간 이상은 이상치로 별도 집계
              outlierDurations.push(durationMs)
            }
          }
          exitIdx++ // 이 EXIT는 사용됨
        }
      })
    })

    // 인증 사용자: userId별로 이벤트 그룹화
    const authEventsByUser = new Map<string, { enters: Date[]; exits: Date[] }>()

    authEnterLogs.forEach((log) => {
      if (log.userId) {
        if (!authEventsByUser.has(log.userId)) {
          authEventsByUser.set(log.userId, { enters: [], exits: [] })
        }
        authEventsByUser.get(log.userId)!.enters.push(log.createdAt)
      }
    })

    authExitLogs.forEach((log) => {
      if (log.userId) {
        if (!authEventsByUser.has(log.userId)) {
          authEventsByUser.set(log.userId, { enters: [], exits: [] })
        }
        authEventsByUser.get(log.userId)!.exits.push(log.createdAt)
      }
    })

    // 각 사용자별로 ENTER-EXIT 쌍 매칭 (시간순)
    authEventsByUser.forEach((events) => {
      const enters = events.enters.sort((a, b) => a.getTime() - b.getTime())
      const exits = events.exits.sort((a, b) => a.getTime() - b.getTime())

      let exitIdx = 0
      enters.forEach((enterTime) => {
        while (exitIdx < exits.length && exits[exitIdx].getTime() <= enterTime.getTime()) {
          exitIdx++
        }
        if (exitIdx < exits.length) {
          const durationMs = exits[exitIdx].getTime() - enterTime.getTime()
          if (durationMs > 0) {
            if (durationMs < MAX_DURATION_MS) {
              durations.push(durationMs)
            } else {
              // 📊 24시간 이상은 이상치로 별도 집계
              outlierDurations.push(durationMs)
            }
          }
          exitIdx++
        }
      })
    })

    // Average in minutes
    const avgDuration =
      durations.length > 0
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length / 60000)
        : 0

    // 📊 Phase 3.1: 지난주 체류시간 계산 (동일 알고리즘)
    const lastWeekDurations: number[] = []

    // 지난주 게스트 체류시간
    const lastWeekGuestEventsBySession = new Map<string, { enters: Date[]; exits: Date[] }>()

    lastWeekGuestEnterLogs.forEach((log) => {
      if (log.guestSessionId) {
        if (!lastWeekGuestEventsBySession.has(log.guestSessionId)) {
          lastWeekGuestEventsBySession.set(log.guestSessionId, { enters: [], exits: [] })
        }
        lastWeekGuestEventsBySession.get(log.guestSessionId)!.enters.push(log.createdAt)
      }
    })

    lastWeekGuestExitLogs.forEach((log) => {
      if (log.guestSessionId) {
        if (!lastWeekGuestEventsBySession.has(log.guestSessionId)) {
          lastWeekGuestEventsBySession.set(log.guestSessionId, { enters: [], exits: [] })
        }
        lastWeekGuestEventsBySession.get(log.guestSessionId)!.exits.push(log.createdAt)
      }
    })

    lastWeekGuestEventsBySession.forEach((events) => {
      const enters = events.enters.sort((a, b) => a.getTime() - b.getTime())
      const exits = events.exits.sort((a, b) => a.getTime() - b.getTime())
      let exitIdx = 0
      enters.forEach((enterTime) => {
        while (exitIdx < exits.length && exits[exitIdx].getTime() <= enterTime.getTime()) {
          exitIdx++
        }
        if (exitIdx < exits.length) {
          const durationMs = exits[exitIdx].getTime() - enterTime.getTime()
          if (durationMs > 0 && durationMs < MAX_DURATION_MS) {
            lastWeekDurations.push(durationMs)
          }
          exitIdx++
        }
      })
    })

    // 지난주 인증 사용자 체류시간
    const lastWeekAuthEventsByUser = new Map<string, { enters: Date[]; exits: Date[] }>()

    lastWeekAuthEnterLogs.forEach((log) => {
      if (log.userId) {
        if (!lastWeekAuthEventsByUser.has(log.userId)) {
          lastWeekAuthEventsByUser.set(log.userId, { enters: [], exits: [] })
        }
        lastWeekAuthEventsByUser.get(log.userId)!.enters.push(log.createdAt)
      }
    })

    lastWeekAuthExitLogs.forEach((log) => {
      if (log.userId) {
        if (!lastWeekAuthEventsByUser.has(log.userId)) {
          lastWeekAuthEventsByUser.set(log.userId, { enters: [], exits: [] })
        }
        lastWeekAuthEventsByUser.get(log.userId)!.exits.push(log.createdAt)
      }
    })

    lastWeekAuthEventsByUser.forEach((events) => {
      const enters = events.enters.sort((a, b) => a.getTime() - b.getTime())
      const exits = events.exits.sort((a, b) => a.getTime() - b.getTime())
      let exitIdx = 0
      enters.forEach((enterTime) => {
        while (exitIdx < exits.length && exits[exitIdx].getTime() <= enterTime.getTime()) {
          exitIdx++
        }
        if (exitIdx < exits.length) {
          const durationMs = exits[exitIdx].getTime() - enterTime.getTime()
          if (durationMs > 0 && durationMs < MAX_DURATION_MS) {
            lastWeekDurations.push(durationMs)
          }
          exitIdx++
        }
      })
    })

    // 지난주 평균 체류시간 (분)
    const lastWeekAvgDuration =
      lastWeekDurations.length > 0
        ? Math.round(lastWeekDurations.reduce((a, b) => a + b, 0) / lastWeekDurations.length / 60000)
        : 0

    // 📊 주간 체류시간 변화율 계산
    const durationChange =
      lastWeekAvgDuration > 0
        ? Math.round(((avgDuration - lastWeekAvgDuration) / lastWeekAvgDuration) * 100)
        : avgDuration > 0
          ? 100
          : 0

    // 📊 불완전 세션 통계 (데이터 품질 모니터링용)
    // ENTER 없이 EXIT만 있거나, EXIT 없이 ENTER만 있는 세션 카운트
    let incompleteEnterSessions = 0 // EXIT만 있는 세션 (ENTER 누락)
    let incompleteExitSessions = 0  // ENTER만 있는 세션 (EXIT 누락 - 진행 중이거나 비정상 종료)

    guestEventsBySession.forEach((events) => {
      if (events.enters.length === 0 && events.exits.length > 0) {
        incompleteEnterSessions += events.exits.length
      }
      if (events.enters.length > events.exits.length) {
        incompleteExitSessions += events.enters.length - events.exits.length
      }
    })

    authEventsByUser.forEach((events) => {
      if (events.enters.length === 0 && events.exits.length > 0) {
        incompleteEnterSessions += events.exits.length
      }
      if (events.enters.length > events.exits.length) {
        incompleteExitSessions += events.enters.length - events.exits.length
      }
    })

    // ⚡ 재방문율 계산 (DB 집계 결과 사용)
    // 게스트: guestSessionId 기준 (동일 세션 = 동일 사용자, 2회 이상 ENTER = 재방문)
    const guestUniqueVisitors = guestReturnRateData.length
    const guestReturning = guestReturnRateData.filter((r) => r._count > 1).length

    // 인증 사용자: userId 기준 (공간 무관하게 동일 사용자, 2회 이상 ENTER = 재방문)
    const authUniqueVisitors = authReturnRateData.length
    const authReturning = authReturnRateData.filter((r) => r._count > 1).length

    const totalUniqueVisitors = guestUniqueVisitors + authUniqueVisitors
    const totalReturning = guestReturning + authReturning
    const returnRate =
      totalUniqueVisitors > 0
        ? Math.round((totalReturning / totalUniqueVisitors) * 100)
        : 0

    return NextResponse.json({
      totalVisitors,
      peakConcurrent,
      avgDuration,
      returnRate,
      weeklyChange: {
        visitors: visitorChange,
        duration: durationChange, // 📊 Phase 3.1: 지난주 대비 체류시간 변화율
        returnRate: 0, // 재방문율 변화율은 복잡하여 향후 구현
      },
      // 📊 데이터 품질 지표 (불완전 세션 모니터링)
      dataQuality: {
        incompleteEnterSessions, // EXIT만 있음 (ENTER 누락)
        incompleteExitSessions,  // ENTER만 있음 (진행 중 또는 비정상 종료)
        completedSessions: durations.length, // 정상 완료된 세션 수
        outlierSessions: outlierDurations.length, // 24시간 이상 체류 세션
        outlierAvgDuration: outlierDurations.length > 0
          ? Math.round(outlierDurations.reduce((a, b) => a + b, 0) / outlierDurations.length / 60000)
          : 0, // 이상치 평균 체류시간 (분)
      },
    })
  } catch (error) {
    console.error("Error fetching dashboard stats:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
