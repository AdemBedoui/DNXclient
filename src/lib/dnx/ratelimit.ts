import "server-only"

// Best-effort sliding-window limiter per client IP (per warm instance).
// For strict limits across instances, swap for Upstash/Vercel KV or the Vercel Firewall.

const WINDOW_MS = 60_000
const LIMIT = 60 // one report = 6 section requests, so ~10 reports/minute
const hits = new Map<string, number[]>()

export function rateLimited(ip: string): boolean {
  const now = Date.now()
  const arr = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS)
  arr.push(now)
  hits.set(ip, arr)
  if (hits.size > 5000) hits.delete(hits.keys().next().value as string)
  return arr.length > LIMIT
}
