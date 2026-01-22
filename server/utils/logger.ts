/**
 * Structured Logger with Discord Alerts
 * JSON format logging with error code system
 */

import { DISCORD_WEBHOOK_URL, type ErrorCode, type LogLevel, type LogContext } from "../config"

/**
 * Create JSON log entry
 */
function createLogEntry(level: LogLevel, code: ErrorCode | string, msg: string, ctx?: LogContext) {
  return JSON.stringify({
    ts: new Date().toISOString(),
    level,
    service: "socket",
    code,
    msg,
    ...ctx,
  })
}

/**
 * Send Discord webhook alert for errors
 */
async function sendDiscordAlert(
  code: string,
  msg: string,
  ctx?: LogContext,
  level: "error" | "warn" | "info" = "error"
): Promise<void> {
  if (!DISCORD_WEBHOOK_URL) return

  try {
    const hostname = process.env.HOSTNAME || "socket-server"
    const timestamp = new Date().toISOString()

    // Level colors (Discord Embed color)
    const colors = {
      error: 16711680,   // Red
      warn: 16776960,    // Yellow
      info: 3447003,     // Blue
    }

    // Format context
    const contextStr = ctx
      ? Object.entries(ctx)
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => `**${k}**: ${v}`)
          .join("\n")
      : ""

    const payload = {
      embeds: [{
        title: `[${code}] ${msg}`,
        description: contextStr || "No additional context",
        color: colors[level],
        footer: { text: `${hostname} | Socket.io Server` },
        timestamp,
      }],
    }

    await fetch(DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
  } catch {
    // Ignore Discord alert failures (prevent infinite loops)
  }
}

/**
 * Logger instance with info, warn, error methods
 */
export const logger = {
  info: (code: ErrorCode | string, msg: string, ctx?: LogContext) =>
    console.log(createLogEntry("info", code, msg, ctx)),
  warn: (code: ErrorCode | string, msg: string, ctx?: LogContext) =>
    console.warn(createLogEntry("warn", code, msg, ctx)),
  error: (code: ErrorCode | string, msg: string, ctx?: LogContext) => {
    console.error(createLogEntry("error", code, msg, ctx))
    // Send Discord alert on error
    sendDiscordAlert(code, msg, ctx, "error")
  },
}
