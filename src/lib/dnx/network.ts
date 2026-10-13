import "server-only"
import net from "node:net"
import { lookup, lookupTxt, stripDot } from "./doh"
import { isPublicIp } from "./net"
import type { Finding, IpInfo, NetworkData } from "./types"

function reverseName(ip: string): string {
  if (net.isIPv4(ip)) return ip.split(".").reverse().join(".")
  // Expand IPv6 to 32 nibbles.
  const [head, tail = ""] = ip.split("::")
  const h = head ? head.split(":") : []
  const t = tail ? tail.split(":") : []
  const full = [...h, ...Array(8 - h.length - t.length).fill("0"), ...t]
  return full.map((g) => g.padStart(4, "0")).join("").split("").reverse().join(".")
}

// Team Cymru IP-to-ASN mapping over DNS: free, no API key.
async function ipInfo(ip: string): Promise<IpInfo> {
  const v4 = net.isIPv4(ip)
  const rev = reverseName(ip)
  const info: IpInfo = { ip, version: v4 ? 4 : 6 }

  const [ptr, origin] = await Promise.all([
    lookup(`${rev}.${v4 ? "in-addr" : "ip6"}.arpa`, "PTR"),
    lookupTxt(`${rev}.${v4 ? "origin" : "origin6"}.asn.cymru.com`),
  ])
  if (ptr[0]) info.ptr = stripDot(ptr[0])

  // "15169 | 8.8.8.0/24 | US | arin | 2023-12-28"
  const parts = origin[0]?.split("|").map((s) => s.trim())
  if (parts && parts[0]) {
    info.asn = Number(parts[0].split(" ")[0])
    info.prefix = parts[1]
    info.country = parts[2] || undefined
    info.registry = parts[3]?.toUpperCase()
    const as = await lookupTxt(`AS${info.asn}.asn.cymru.com`)
    // "15169 | US | arin | 2000-03-30 | GOOGLE - Google LLC, US"
    info.asName = as[0]?.split("|")[4]?.trim()
  }
  return info
}

export async function checkNetwork(domain: string): Promise<{ data: NetworkData; findings: Finding[] }> {
  const [a, aaaa] = await Promise.all([lookup(domain, "A"), lookup(domain, "AAAA")])
  const ips = [...a.slice(0, 4), ...aaaa.slice(0, 2)].filter((ip) => net.isIP(ip) && isPublicIp(ip))
  const data: NetworkData = { ips: await Promise.all(ips.map(ipInfo)) }

  const findings: Finding[] = []
  const v4 = data.ips.filter((i) => i.version === 4)
  if (v4.length && v4.some((i) => !i.ptr)) {
    findings.push({ id: "net-no-ptr", category: "dns", severity: "info", title: "No reverse DNS (PTR) for the server IP", detail: "Only matters if this server also sends email.", fix: "Ask your hosting provider to set a PTR record for the IP." })
  }
  return { data, findings }
}
