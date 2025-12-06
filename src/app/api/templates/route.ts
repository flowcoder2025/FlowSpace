/**
 * Template API Routes
 *
 * GET /api/templates - 템플릿 목록 조회
 */

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// ============================================
// GET /api/templates - 템플릿 목록 조회
// ============================================
export async function GET() {
  try {
    const templates = await prisma.template.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "asc" },
    })

    return NextResponse.json(templates)
  } catch (error) {
    console.error("Failed to fetch templates:", error)
    return NextResponse.json(
      { error: "Failed to fetch templates" },
      { status: 500 }
    )
  }
}
