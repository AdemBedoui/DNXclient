import "server-only"
import tls from "node:tls"
import { X509Certificate } from "node:crypto"
import { publicIpFor } from "./resolve"
import type { CertSummary, Finding, SslData } from "./types"

const DAY = 86_400_000

const first = (v?: string | string[]) => (Array.isArray(v) ? v[0] : v)

function nameMatches(pattern: string, host: string): boolean {
  if (pattern === host) return true
  if (pattern.startsWith("*.")) {
    const rest = pattern.slice(2)
    return host.endsWith(`.${rest}`) && host.split(".").length === rest.split(".").length + 1
  }
  return false
}

function connect(ip: string, servername: string): Promise<tls.TLSSocket> {
  return new Promise((resolve, reject) => {
    const sock = tls.connect({
      host: ip,
      port: 443,
      servername,
      rejectUnauthorized: false,
      timeout: 7000,
      ALPNProtocols: ["h2", "http/1.1"],
    })
    sock.once("secureConnect", () => resolve(sock))
    sock.once("timeout", () => {
      sock.destroy()
      reject(new Error("Connection to port 443 timed out"))
    })
    sock.once("error", reject)
  })
}

export async function checkSsl(domain: string): Promise<{ data: SslData; findings: Finding[] }> {
  const ip = await publicIpFor(domain)
  if (!ip) {
    const data: SslData = { reachable: false, error: "Domain does not resolve to a public IP address", altNames: [], chain: [] }
    return { data, findings: [] }
  }

  let sock: tls.TLSSocket
  try {
    sock = await connect(ip, domain)
  } catch (e) {
    const data: SslData = { reachable: false, error: (e as Error).message, altNames: [], chain: [] }
    return {
      data,
      findings: [{ id: "ssl-unreachable", category: "security", severity: "fail", title: "HTTPS is not available", detail: data.error, fix: "Install a TLS certificate (Let's Encrypt is free) and serve the site on port 443." }],
    }
  }

  try {
    const peer = sock.getPeerCertificate(true)
    const leaf = new X509Certificate(peer.raw)
    const altNames = (leaf.subjectAltName ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.startsWith("DNS:"))
      .map((s) => s.slice(4).toLowerCase())

    const chain: CertSummary[] = []
    let cur: tls.DetailedPeerCertificate | undefined = peer
    const seen = new Set<string>()
    while (cur && cur.raw && !seen.has(cur.fingerprint256)) {
      seen.add(cur.fingerprint256)
      chain.push({
        subject: first(cur.subject?.CN) ?? first(cur.subject?.O) ?? "—",
        issuer: first(cur.issuer?.O) ?? first(cur.issuer?.CN) ?? "—",
        validFrom: new Date(cur.valid_from).toISOString(),
        validTo: new Date(cur.valid_to).toISOString(),
      })
      cur = cur.issuerCertificate
    }

    const validTo = new Date(leaf.validTo)
    const data: SslData = {
      reachable: true,
      trusted: sock.authorized,
      trustError: sock.authorized ? undefined : String(sock.authorizationError ?? "Untrusted certificate"),
      protocol: sock.getProtocol() ?? undefined,
      cipher: sock.getCipher()?.name,
      subject: first(peer.subject?.CN),
      issuer: first(peer.issuer?.O) ?? first(peer.issuer?.CN),
      validFrom: new Date(leaf.validFrom).toISOString(),
      validTo: validTo.toISOString(),
      daysRemaining: Math.floor((validTo.getTime() - Date.now()) / DAY),
      altNames,
      coversWww: altNames.some((n) => nameMatches(n, `www.${domain}`)),
      keyBits: peer.bits,
      selfSigned: leaf.issuer === leaf.subject,
      chain,
    }
    return { data, findings: sslFindings(domain, data) }
  } finally {
    sock.destroy()
  }
}

function sslFindings(domain: string, d: SslData): Finding[] {
  const f: Finding[] = []
  const c = "security" as const
  const coversApex = d.altNames.some((n) => nameMatches(n, domain))

  if (d.daysRemaining !== undefined && d.daysRemaining < 0) {
    f.push({ id: "ssl-expired", category: c, severity: "fail", title: "SSL certificate has expired", detail: "Browsers show a full-page security warning to every visitor.", fix: "Renew the certificate now, and set up automatic renewal (e.g. certbot or your host's auto-SSL)." })
  } else if (!d.trusted) {
    f.push({ id: "ssl-untrusted", category: c, severity: "fail", title: d.selfSigned ? "Self-signed certificate" : "Certificate is not trusted", detail: d.trustError, fix: "Use a certificate from a trusted authority and make sure the full intermediate chain is installed." })
  } else if (!coversApex) {
    f.push({ id: "ssl-name", category: c, severity: "fail", title: `Certificate does not cover ${domain}`, fix: `Reissue the certificate including ${domain} as a name.` })
  } else if ((d.daysRemaining ?? 99) < 14) {
    f.push({ id: "ssl-expiring", category: c, severity: "warn", title: `SSL certificate expires in ${d.daysRemaining} days`, fix: "Check that automatic renewal is working." })
  } else {
    f.push({ id: "ssl-ok", category: c, severity: "pass", title: `Valid certificate from ${d.issuer} (${d.daysRemaining} days left)` })
  }

  if (d.trusted && !d.coversWww) {
    f.push({ id: "ssl-www", category: c, severity: "warn", title: `Certificate does not cover www.${domain}`, fix: `Add www.${domain} to the certificate so https://www. works without a warning.` })
  }

  if (d.protocol === "TLSv1.3") f.push({ id: "tls13", category: c, severity: "pass", title: "Supports TLS 1.3" })
  else if (d.protocol === "TLSv1" || d.protocol === "TLSv1.1") {
    f.push({ id: "tls-old", category: c, severity: "fail", title: `Negotiated outdated ${d.protocol}`, fix: "Disable TLS 1.0/1.1 and enable TLS 1.2 and 1.3 on the server." })
  }
  return f
}
