import "server-only"
import { cached } from "./cache"
import { checkDns } from "./dns"
import { checkEmail } from "./email"
import { checkNetwork } from "./network"
import { checkRegistration } from "./registration"
import { checkSsl } from "./ssl"
import type { Finding, SectionDataMap, SectionName } from "./types"
import { checkWeb } from "./web"

const CHECKS: { [K in SectionName]: (d: string) => Promise<{ data: SectionDataMap[K]; findings: Finding[] }> } = {
  registration: checkRegistration,
  dns: checkDns,
  email: checkEmail,
  ssl: checkSsl,
  web: checkWeb,
  network: checkNetwork,
}

const TTL_MS = 5 * 60_000

/** Runs one section check, sharing a short in-process cache between the API and server-rendered pages. */
export async function runCheck<K extends SectionName>(section: K, domain: string, fresh = false) {
  const start = Date.now()
  const check = CHECKS[section] as (d: string) => Promise<{ data: SectionDataMap[K]; findings: Finding[] }>
  const result = fresh ? await check(domain) : await cached(`${section}:${domain}`, TTL_MS, () => check(domain))
  return { ...result, durationMs: Date.now() - start }
}
