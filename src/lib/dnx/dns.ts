import "server-only"
import { doh, lookupRecords, RR, stripDot, UDP_RESOLVERS, udpResolve4, type RecordWithTtl } from "./doh"
import type { DnsData, Finding, MxRecord, PropagationResult } from "./types"

export function parseMx(data: string[]): MxRecord[] {
  return data
    .map((d) => {
      const [p, ex] = d.split(/\s+/)
      return { priority: Number(p), exchange: stripDot(ex ?? "") }
    })
    .filter((m) => m.exchange)
    .sort((a, b) => a.priority - b.priority)
}

async function propagation(domain: string): Promise<PropagationResult[]> {
  const doHs = [
    { resolver: "Cloudflare", location: "1.1.1.1", provider: 0 as const },
    { resolver: "Google", location: "8.8.8.8", provider: 1 as const },
  ]
  const jobs: Promise<PropagationResult>[] = [
    ...doHs.map(async ({ resolver, location, provider }) => {
      try {
        const r = await doh(domain, "A", provider)
        const A = r.answers.filter((a) => a.type === RR.A).map((a) => a.data)
        return { resolver, location, A, ok: true }
      } catch {
        return { resolver, location, A: [], ok: false }
      }
    }),
    ...UDP_RESOLVERS.map(async ({ resolver, ip }) => {
      try {
        return { resolver, location: ip, A: await udpResolve4(ip, domain), ok: true }
      } catch (e) {
        // ENOTFOUND / ENODATA are real answers (no record), not resolver failures.
        const code = (e as { code?: string }).code
        return { resolver, location: ip, A: [], ok: code === "ENOTFOUND" || code === "ENODATA" }
      }
    }),
  ]
  return Promise.all(jobs)
}

export async function checkDns(domain: string): Promise<{ data: DnsData; findings: Finding[] }> {
  const types = ["SOA", "NS", "A", "AAAA", "CNAME", "MX", "TXT", "CAA"] as const
  const [apex, wwwRecs, ds, prop] = await Promise.all([
    Promise.all(types.map((t) => lookupRecords(domain, t))),
    Promise.all([lookupRecords(`www.${domain}`, "CNAME"), lookupRecords(`www.${domain}`, "A"), lookupRecords(`www.${domain}`, "AAAA")]),
    doh(domain, "DS").catch(() => null),
    propagation(domain),
  ])
  const by = Object.fromEntries(types.map((t, i) => [t, apex[i]])) as Record<(typeof types)[number], RecordWithTtl[]>
  const values = (t: (typeof types)[number]) => by[t].map((r) => r.value)
  const www = wwwRecs[0].length ? wwwRecs[0] : [...wwwRecs[1], ...wwwRecs[2]]

  // AD flag on an A query means the resolver validated the DNSSEC chain.
  const validated = await doh(domain, "A").then((r) => r.ad).catch(() => false)

  const data: DnsData = {
    records: [...apex.flat(), ...www],
    A: values("A"),
    AAAA: values("AAAA"),
    CNAME: values("CNAME").map(stripDot),
    NS: values("NS").map(stripDot).sort(),
    MX: parseMx(values("MX")),
    TXT: values("TXT"),
    CAA: values("CAA"),
    SOA: values("SOA")[0],
    wwwResolves: www.length > 0,
    dnssec: { signed: !!ds && ds.answers.some((a) => a.type === RR.DS), validated },
    propagation: prop,
  }

  return { data, findings: dnsFindings(data) }
}

function dnsFindings(d: DnsData): Finding[] {
  const f: Finding[] = []
  const c = "dns" as const

  if (d.NS.length === 0) {
    f.push({ id: "dns-no-ns", category: c, severity: "fail", title: "No name servers found", detail: "The domain is not delegated, so nothing on it can resolve.", fix: "Set name servers for the domain at your registrar." })
  } else if (d.NS.length === 1) {
    f.push({ id: "dns-one-ns", category: c, severity: "warn", title: "Only one name server", fix: "Use at least two name servers so the domain stays online if one fails." })
  } else {
    f.push({ id: "dns-ns-ok", category: c, severity: "pass", title: `${d.NS.length} name servers configured` })
  }

  if (d.A.length === 0 && d.AAAA.length === 0) {
    f.push({ id: "dns-no-a", category: c, severity: "warn", title: "Domain has no A or AAAA record", detail: "Visitors typing the bare domain won't reach a website.", fix: "Add an A record pointing to your web server's IP address." })
  }

  if (!d.wwwResolves && (d.A.length || d.AAAA.length)) {
    f.push({ id: "dns-no-www", category: c, severity: "warn", title: "www subdomain does not resolve", detail: "Many visitors still type www. in front of domains.", fix: "Add a CNAME record for www pointing to the bare domain (or an A record to the same IP)." })
  }

  if (d.AAAA.length) {
    f.push({ id: "dns-ipv6", category: c, severity: "pass", title: "IPv6 enabled" })
  } else if (d.A.length) {
    f.push({ id: "dns-no-ipv6", category: c, severity: "info", title: "No IPv6 (AAAA) record", fix: "If your host supports IPv6, add an AAAA record to reach IPv6-only networks." })
  }

  if (d.dnssec.signed) {
    f.push({ id: "dns-dnssec", category: c, severity: "pass", title: d.dnssec.validated ? "DNSSEC signed and validating" : "DNSSEC enabled" })
  } else {
    f.push({ id: "dns-no-dnssec", category: c, severity: "info", title: "DNSSEC not enabled", detail: "DNSSEC protects visitors from forged DNS answers.", fix: "Enable DNSSEC at your DNS provider, then add the DS record at your registrar." })
  }

  if (d.CAA.length) {
    f.push({ id: "dns-caa", category: c, severity: "pass", title: "CAA record restricts certificate issuers" })
  } else {
    f.push({ id: "dns-no-caa", category: c, severity: "info", title: "No CAA record", fix: 'Add a CAA record (e.g. 0 issue "letsencrypt.org") so only your chosen authority can issue certificates.' })
  }

  const ok = d.propagation.filter((p) => p.ok)
  const sets = new Set(ok.map((p) => [...p.A].sort().join(",")))
  if (ok.length >= 2 && sets.size > 1) {
    f.push({ id: "dns-propagation", category: c, severity: "info", title: "Resolvers return different IP addresses", detail: "Either a DNS change is still propagating, or the domain uses geo/load-balanced DNS.", fix: "If you recently changed DNS, wait for the old TTL to expire. Otherwise this is usually expected for CDNs." })
  }

  return f
}
