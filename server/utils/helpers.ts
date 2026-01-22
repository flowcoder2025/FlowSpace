/**
 * Socket Helper Functions
 * Utility functions for finding sockets and extracting data
 */

import type { Server, Socket } from "socket.io"
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData,
} from "../../src/features/space/socket/types"

export type TypedServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>

export type TypedSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>

/**
 * Find socket by member ID
 */
export function findSocketByMemberId(
  io: TypedServer,
  spaceId: string,
  memberId: string
): TypedSocket | null {
  const socketsInRoom = io.sockets.adapter.rooms.get(spaceId)
  if (!socketsInRoom) return null

  for (const socketId of socketsInRoom) {
    const s = io.sockets.sockets.get(socketId)
    if (s && s.data.memberId === memberId) {
      return s as TypedSocket
    }
  }
  return null
}

/**
 * Find socket by nickname (returns first match)
 */
export function findSocketByNickname(
  io: TypedServer,
  spaceId: string,
  targetNickname: string
): TypedSocket | null {
  const socketsInRoom = io.sockets.adapter.rooms.get(spaceId)
  if (!socketsInRoom) return null

  for (const socketId of socketsInRoom) {
    const s = io.sockets.sockets.get(socketId)
    if (s && s.data.nickname === targetNickname) {
      return s as TypedSocket
    }
  }
  return null
}

/**
 * Find all sockets by nickname (same nickname can have multiple connections)
 */
export function findAllSocketsByNickname(
  io: TypedServer,
  spaceId: string,
  targetNickname: string
): TypedSocket[] {
  const socketsInRoom = io.sockets.adapter.rooms.get(spaceId)
  if (!socketsInRoom) return []

  const matchedSockets: TypedSocket[] = []
  for (const socketId of socketsInRoom) {
    const s = io.sockets.sockets.get(socketId)
    if (s && s.data.nickname === targetNickname) {
      matchedSockets.push(s as TypedSocket)
    }
  }
  return matchedSockets
}

/**
 * Extract nickname from "nickname:" prefix format
 */
export function extractNickname(targetMemberId: string): string | null {
  if (targetMemberId.startsWith("nickname:")) {
    return targetMemberId.replace("nickname:", "")
  }
  return null
}
