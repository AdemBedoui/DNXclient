import "server-only"

// Tiny in-process TTL cache. On serverless it only helps within a warm
// instance; the CDN cache headers on the API route do the heavy lifting.

const MAX = 500
const store = new Map<string, { value: unknown; expires: number }>()

export async function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const hit = store.get(key)
  if (hit && hit.expires > Date.now()) return hit.value as T
  const value = await fn()
  if (store.size >= MAX) store.delete(store.keys().next().value as string)
  store.set(key, { value, expires: Date.now() + ttlMs })
  return value
}
