/**
 * NextAuth v5 API Route Handler
 *
 * Handles all authentication routes:
 * - GET /api/auth/signin
 * - GET /api/auth/signout
 * - GET /api/auth/callback/:provider
 * - GET /api/auth/session
 * - POST /api/auth/signin/:provider
 * - POST /api/auth/signout
 */

import { handlers } from "@/lib/auth"

export const { GET, POST } = handlers
