import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { SessionProvider } from "@/components/providers/session-provider"
import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Flow Metaverse | 브라우저에서 즉시 입장하는 2D 메타버스",
  description:
    "설치 없이 링크만 클릭하면 팀원들과 함께하는 가상 공간. 오피스, 강의실, 라운지 템플릿으로 10분 내 개설.",
  keywords: ["메타버스", "가상공간", "원격협업", "가상오피스", "화상회의"],
  openGraph: {
    title: "Flow Metaverse",
    description: "브라우저에서 즉시 입장하는 2D 메타버스",
    type: "website",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen antialiased`}
      >
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  )
}
