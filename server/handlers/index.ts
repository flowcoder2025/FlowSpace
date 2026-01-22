/**
 * Handler Registry
 * Registers all event handlers on socket connection
 */

import type { TypedServer, TypedSocket } from "../utils"

import { registerRoomHandlers } from "./room"
import { registerPlayerHandlers } from "./player"
import { registerChatHandlers } from "./chat"
import { registerPartyHandlers } from "./party"
import { registerAdminHandlers } from "./admin"
import { registerMediaHandlers } from "./media"
import { registerObjectsHandlers } from "./objects"
import { registerDisconnectHandler } from "./disconnect"

/**
 * Register all event handlers for a connected socket
 */
export function registerHandlers(io: TypedServer, socket: TypedSocket) {
  // Room handlers (join:space, leave:space)
  registerRoomHandlers(io, socket)

  // Player handlers (player:move, player:jump, player:updateProfile)
  registerPlayerHandlers(io, socket)

  // Chat handlers (chat:message, whisper:send, reaction:toggle)
  registerChatHandlers(io, socket)

  // Party handlers (party:join, party:leave, party:message)
  registerPartyHandlers(io, socket)

  // Admin handlers (admin:mute, admin:unmute, admin:kick, admin:deleteMessage, admin:announce)
  registerAdminHandlers(io, socket)

  // Media handlers (recording:start/stop, spotlight:activate/deactivate, proximity:set)
  registerMediaHandlers(io, socket)

  // Objects handlers (object:place, object:update, object:delete)
  registerObjectsHandlers(io, socket)

  // Disconnect handler
  registerDisconnectHandler(io, socket)
}

// Re-export individual handlers for testing
export {
  registerRoomHandlers,
  registerPlayerHandlers,
  registerChatHandlers,
  registerPartyHandlers,
  registerAdminHandlers,
  registerMediaHandlers,
  registerObjectsHandlers,
  registerDisconnectHandler,
}
