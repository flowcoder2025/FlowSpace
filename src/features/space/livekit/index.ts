/**
 * LiveKit module exports
 *
 * @livekit/components-react 공식 훅 기반 아키텍처:
 * - LiveKitRoomProvider: 토큰 페칭 + LiveKitRoom 컨텍스트 제공
 * - useLiveKitMedia: 컨텍스트 기반 미디어 상태/제어 (항상 안전하게 호출 가능)
 * - useLiveKit: 레거시 훅 (하위 호환용, deprecated)
 */

// 새 아키텍처 (권장)
export { LiveKitRoomProvider } from "./LiveKitRoomProvider"
export { useLiveKitMedia } from "./LiveKitMediaContext"
export type { MediaError, LiveKitMediaContextValue } from "./LiveKitMediaContext"

/**
 * @deprecated useLiveKitMedia를 사용하세요. 이 훅은 다음 버전에서 제거됩니다.
 *
 * 마이그레이션 가이드:
 * - useLiveKit() → useLiveKitMedia()
 * - LiveKitRoomProvider 내부에서만 사용 가능
 * - 동일 화면에서 useLiveKit과 useLiveKitMedia 혼용 금지
 */
export { useLiveKit } from "./useLiveKit"

// 공통 타입
export type {
  LiveKitConfig,
  MediaState,
  ParticipantTrack,
} from "./types"
