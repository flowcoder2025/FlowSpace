import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // 번들 최적화: 대용량 패키지의 트리 셰이킹 개선
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "@livekit/components-react",
      "@livekit/components-styles",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-tabs",
      "@radix-ui/react-switch",
      "@radix-ui/react-slider",
    ],
  },

  // 이미지 최적화 설정
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
    ],
  },

  // TypeScript 빌드 에러 무시 (개발 중에만 사용)
  typescript: {
    // 프로덕션 배포 전 false로 변경
    ignoreBuildErrors: false,
  },

  // ESLint 빌드 에러 무시 (개발 중에만 사용)
  eslint: {
    // 프로덕션 배포 전 false로 변경
    ignoreDuringBuilds: false,
  },
}

export default nextConfig
