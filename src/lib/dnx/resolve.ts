import "server-only"
import { lookup } from "./doh"
import { isPublicIp } from "./net"

/**
 * Resolves the domain and returns a public IP to connect to, or null.
 * Connecting only to vetted public IPs keeps the SSL/HTTP checks from being
 * used to probe internal networks.
 */
export async function publicIpFor(host: string): Promise<string | null> {
  const [a, aaaa] = await Promise.all([lookup(host, "A"), lookup(host, "AAAA")])
  const ips = [...a, ...aaaa].filter((x) => /^[\d.]+$|:/.test(x))
  if (ips.length === 0) return null
  if (!ips.every(isPublicIp)) return null
  return a.find(isPublicIp) ?? ips[0]
}
