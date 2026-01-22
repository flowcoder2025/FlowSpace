/**
 * Socket Server Shared State
 * Room, party, recording, spotlight, and proximity states
 */

import type {
  PlayerPosition,
  RecordingStatusData,
} from "../src/features/space/socket/types"

// ============================================
// Room State: spaceId -> Map<playerId, PlayerPosition>
// ============================================
export const rooms = new Map<string, Map<string, PlayerPosition>>()

export function getOrCreateRoom(spaceId: string): Map<string, PlayerPosition> {
  if (!rooms.has(spaceId)) {
    rooms.set(spaceId, new Map())
  }
  return rooms.get(spaceId)!
}

export function removePlayerFromRoom(spaceId: string, playerId: string): void {
  const room = rooms.get(spaceId)
  if (room) {
    room.delete(playerId)
    if (room.size === 0) {
      rooms.delete(spaceId)
    }
  }
}

// ============================================
// Party/Zone State: partyRoomId -> Set<socketId>
// partyRoomId format: "{spaceId}:party:{partyId}"
// ============================================
export const partyRooms = new Map<string, Set<string>>()

export function getPartyRoomId(spaceId: string, partyId: string): string {
  return `${spaceId}:party:${partyId}`
}

export function getOrCreatePartyRoom(spaceId: string, partyId: string): Set<string> {
  const partyRoomId = getPartyRoomId(spaceId, partyId)
  if (!partyRooms.has(partyRoomId)) {
    partyRooms.set(partyRoomId, new Set())
  }
  return partyRooms.get(partyRoomId)!
}

export function removeFromPartyRoom(spaceId: string, partyId: string, socketId: string): void {
  const partyRoomId = getPartyRoomId(spaceId, partyId)
  const partyRoom = partyRooms.get(partyRoomId)
  if (partyRoom) {
    partyRoom.delete(socketId)
    if (partyRoom.size === 0) {
      partyRooms.delete(partyRoomId)
    }
  }
}

// ============================================
// Recording State: spaceId -> RecordingStatusData
// ============================================
export const recordingStates = new Map<string, RecordingStatusData>()

// ============================================
// Spotlight State: spaceId -> Map<participantId, ActiveSpotlight>
// ============================================
export interface ActiveSpotlight {
  participantId: string
  nickname: string
}

export const spotlightStates = new Map<string, Map<string, ActiveSpotlight>>()

export function getOrCreateSpotlightState(spaceId: string): Map<string, ActiveSpotlight> {
  if (!spotlightStates.has(spaceId)) {
    spotlightStates.set(spaceId, new Map())
  }
  return spotlightStates.get(spaceId)!
}

// ============================================
// Proximity State: spaceId -> boolean (enabled/disabled)
// Default: false (global mode)
// ============================================
export const proximityStates = new Map<string, boolean>()

export function getProximityState(spaceId: string): boolean {
  return proximityStates.get(spaceId) ?? false
}

export function setProximityState(spaceId: string, enabled: boolean): void {
  proximityStates.set(spaceId, enabled)
}
