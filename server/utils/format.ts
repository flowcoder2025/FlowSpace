/**
 * Formatting Utilities
 * Uptime formatting and storage metrics
 */

import { execSync } from "child_process"

/**
 * Format uptime to human-readable format
 */
export function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  const parts: string[] = []
  if (days > 0) parts.push(`${days}d`)
  if (hours > 0) parts.push(`${hours}h`)
  if (minutes > 0) parts.push(`${minutes}m`)
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`)

  return parts.join(" ")
}

/**
 * Storage metrics interface
 */
export interface StorageMetrics {
  totalGB: number
  usedGB: number
  availableGB: number
  usedPercent: number
  mountPoint: string
}

/**
 * Get disk storage usage metrics
 * Parses df command output for root partition info
 */
export function getStorageMetrics(): StorageMetrics | null {
  try {
    // df -B1 /: Get root partition info in bytes
    const output = execSync("df -B1 / 2>/dev/null | tail -1", { encoding: "utf-8" })
    const parts = output.trim().split(/\s+/)

    if (parts.length >= 6) {
      const totalBytes = parseInt(parts[1], 10)
      const usedBytes = parseInt(parts[2], 10)
      const availableBytes = parseInt(parts[3], 10)
      const usedPercent = parseInt(parts[4].replace("%", ""), 10)
      const mountPoint = parts[5]

      return {
        totalGB: Math.round((totalBytes / (1024 ** 3)) * 100) / 100,
        usedGB: Math.round((usedBytes / (1024 ** 3)) * 100) / 100,
        availableGB: Math.round((availableBytes / (1024 ** 3)) * 100) / 100,
        usedPercent,
        mountPoint,
      }
    }
    return null
  } catch {
    // Storage metrics not available (Windows, etc.)
    return null
  }
}
