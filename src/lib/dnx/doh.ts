import "server-only"
import { Resolver } from "node:dns/promises"

// DNS-over-HTTPS (JSON API) so we can query any record type (DS, CAA, …) and
// see the DNSSEC "AD" flag. Cloudflare first, Google as fallback.

export const RR = { A: 1, NS: 2, CNAME: 5, SOA: 6, PTR: 12, MX: 15, TXT: 16, AAAA: 28, DS: 43, CAA: 257 } as const
export type RRType = keyof typeof RR

interface DohAnswer {
  name: string
  type: number
  TTL: number
  data: string
}

export interface DohResponse {
  status: number // 0 NOERROR, 2 SERVFAIL, 3 NXDOMAIN
  ad: boolean
  answers: DohAnswer[]
}

const PROVIDERS = [
  (n: string, t: string) => `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(n)}&type=${t}`,
  (n: string, t: string) => `https://dns.google/resolve?name=${encodeURIComponent(n)}&type=${t}`,
]

async function fetchDoh(url: string): Promise<DohResponse> {
  const res = await fetch(url, {
    headers: { accept: "application/dns-json" },
    signal: AbortSignal.timeout(4000),
    cache: "no-store",
  })
  if (!res.ok) throw new Error(`DoH HTTP ${res.status}`)
  const j = await res.json()
  return { status: j.Status ?? 2, ad: !!j.AD, answers: j.Answer ?? [] }
}

export async function doh(name: string, type: RRType, provider?: 0 | 1): Promise<DohResponse> {
  const order = provider === undefined ? [0, 1] : [provider]
  let lastErr: unknown
  for (const i of order) {
    try {
      return await fetchDoh(PROVIDERS[i](name, type))
    } catch (e) {
      lastErr = e
    }
  }
  throw lastErr
}

/** Answers of the requested type only (drops CNAME chain entries). */
export async function lookup(name: string, type: RRType): Promise<string[]> {
  try {
    const r = await doh(name, type)
    return r.answers.filter((a) => a.type === RR[type]).map((a) => a.data)
  } catch {
    return []
  }
}

/** TXT data arrives as one or more quoted chunks: "v=spf1 " "include:…". */
export function joinTxt(data: string): string {
  const chunks = data.match(/"((?:[^"\\]|\\.)*)"/g)
  if (!chunks) return data
  return chunks.map((c) => c.slice(1, -1).replace(/\\"/g, '"')).join("")
}

export async function lookupTxt(name: string): Promise<string[]> {
  return (await lookup(name, "TXT")).map(joinTxt)
}

export const stripDot = (s: string) => s.replace(/\.$/, "")

// Plain UDP resolvers used for the propagation check.
export const UDP_RESOLVERS = [
  { resolver: "Quad9", location: "Global anycast", ip: "9.9.9.9" },
  { resolver: "OpenDNS", location: "Global anycast", ip: "208.67.222.222" },
]

export async function udpResolve4(server: string, name: string): Promise<string[]> {
  const r = new Resolver({ timeout: 2500, tries: 1 })
  r.setServers([server])
  return r.resolve4(name)
}
