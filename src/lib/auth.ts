/**
 * NextAuth v5 Configuration
 *
 * OAuth provider: Google only (for MVP)
 * Database adapter: Prisma
 * Session strategy: JWT
 *
 * Note: GitHub and Credentials providers are temporarily disabled.
 * To re-enable, uncomment the relevant sections below.
 */

import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import Google from "next-auth/providers/google"
import { prisma } from "./prisma"

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    // TODO: Re-enable GitHub when needed
    // GitHub({
    //   clientId: process.env.GITHUB_CLIENT_ID!,
    //   clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    // }),
    // TODO: Re-enable Credentials when needed
    // Credentials({ ... }),
  ],
  session: {
    strategy: "jwt",
  },
  trustHost: true, // Required for Vercel deployment
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id
        // 첫 로그인 시 DB에서 동의 상태 조회
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { agreedToRecording: true },
        })
        token.agreedToRecording = dbUser?.agreedToRecording ?? false
      }
      // update 트리거 시 (동의 후) 토큰 갱신
      if (trigger === "update" && token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { agreedToRecording: true },
        })
        token.agreedToRecording = dbUser?.agreedToRecording ?? false
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.agreedToRecording = token.agreedToRecording as boolean
      }
      return session
    },
  },
})

// Type augmentation for session
declare module "next-auth" {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      agreedToRecording?: boolean
    }
  }
}

// JWT 타입은 next-auth 내부에서 자동 추론됨
