import { defineConfig, globalIgnores } from "eslint/config"
import nextVitals from "eslint-config-next/core-web-vitals"
import nextTs from "eslint-config-next/typescript"

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // 필요시 규칙 커스터마이징
      "@next/next/no-img-element": "off", // Phaser 게임에서 img 사용 허용
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Custom ignores:
    "node_modules/**",
    "scripts/**", // Node.js 스크립트 (CommonJS)
  ]),
])

export default eslintConfig
