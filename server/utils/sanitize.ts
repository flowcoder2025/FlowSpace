/**
 * XSS Prevention: Server-side message sanitization
 * Removes HTML tags and escapes dangerous characters
 */

export function sanitizeMessageContent(content: string): string {
  // 1. Remove HTML tags
  let text = content.replace(/<[^>]*>/g, "")

  // 2. Decode HTML entities
  text = text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/")

  // 3. Escape dangerous characters
  const escapeMap: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#x27;",
  }
  return text.replace(/[&<>"']/g, (char) => escapeMap[char] || char)
}
