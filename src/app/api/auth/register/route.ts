/**
 * User Registration API
 *
 * POST /api/auth/register - 이메일/비밀번호 회원가입
 */

import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"

// ============================================
// Types
// ============================================
interface RegisterBody {
  email: string
  password: string
  name?: string
}

// ============================================
// Validation
// ============================================
function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

function validatePassword(password: string): { valid: boolean; message?: string } {
  if (password.length < 8) {
    return { valid: false, message: "비밀번호는 8자 이상이어야 합니다" }
  }
  if (!/[A-Za-z]/.test(password)) {
    return { valid: false, message: "비밀번호에 영문자가 포함되어야 합니다" }
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: "비밀번호에 숫자가 포함되어야 합니다" }
  }
  return { valid: true }
}

// ============================================
// POST /api/auth/register - 회원가입
// ============================================
export async function POST(request: NextRequest) {
  try {
    const body: RegisterBody = await request.json()
    const { email, password, name } = body

    // 필수 필드 검증
    if (!email || !password) {
      return NextResponse.json(
        { error: "이메일과 비밀번호를 입력해주세요" },
        { status: 400 }
      )
    }

    // 이메일 형식 검증
    if (!validateEmail(email)) {
      return NextResponse.json(
        { error: "올바른 이메일 형식이 아닙니다" },
        { status: 400 }
      )
    }

    // 비밀번호 강도 검증
    const passwordValidation = validatePassword(password)
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { error: passwordValidation.message },
        { status: 400 }
      )
    }

    // 이메일 중복 확인
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "이미 사용 중인 이메일입니다" },
        { status: 409 }
      )
    }

    // 비밀번호 해싱
    const hashedPassword = await bcrypt.hash(password, 12)

    // 사용자 생성
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        name: name || null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    })

    return NextResponse.json(
      {
        message: "회원가입이 완료되었습니다",
        user,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Registration failed:", error)
    return NextResponse.json(
      { error: "회원가입에 실패했습니다" },
      { status: 500 }
    )
  }
}
