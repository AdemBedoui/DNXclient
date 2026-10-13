// Shared types for the DNX check engine (server) and report UI (client).

export type Severity = "pass" | "info" | "warn" | "fail"

export type Category = "registration" | "dns" | "email" | "security" | "web"

export interface Finding {
  id: string
  category: Category
  severity: Severity
  title: string
  detail?: string
  /** Plain-language fix, shown when the finding is not a pass. */
  fix?: string
}

export type SectionName = "registration" | "dns" | "email" | "ssl" | "web" | "network"

export const SECTIONS: SectionName[] = ["registration", "dns", "email", "ssl", "web", "network"]

export interface SectionResult<T> {
  data: T
  findings: Finding[]
  durationMs: number
}

// ---------------------------------------------------------------------------
// Registration (RDAP / WHOIS)
// ---------------------------------------------------------------------------
export type RegistrationStatus = "registered" | "available" | "unknown"

export interface Contact {
  name?: string
  organization?: string
  country?: string
  email?: string
}

export interface RegistrationData {
  status: RegistrationStatus
  source: "rdap" | "whois" | "none"
  registrar?: string
  createdAt?: string
  updatedAt?: string
  expiresAt?: string
  statuses: string[]
  nameservers: string[]
  dnssec?: boolean
  registrant?: Contact
  admin?: Contact
  raw?: string
}

// ---------------------------------------------------------------------------
// DNS
// ---------------------------------------------------------------------------
export interface MxRecord {
  priority: number
  exchange: string
}

export interface PropagationResult {
  resolver: string
  location: string
  A: string[]
  ok: boolean
}

export interface DnsRecord {
  type: string
  name: string
  value: string
  ttl: number
}

export interface DnsData {
  /** Every record found, in zone-file order, for the records table. */
  records: DnsRecord[]
  A: string[]
  AAAA: string[]
  CNAME: string[]
  NS: string[]
  MX: MxRecord[]
  TXT: string[]
  CAA: string[]
  SOA?: string
  wwwResolves: boolean
  dnssec: { signed: boolean; validated: boolean }
  propagation: PropagationResult[]
}

// ---------------------------------------------------------------------------
// Email
// ---------------------------------------------------------------------------
export interface SpfAnalysis {
  record?: string
  lookups: number
  all?: string
  includes: string[]
  errors: string[]
}

export interface DmarcAnalysis {
  record?: string
  policy?: string
  subdomainPolicy?: string
  pct?: number
  rua: string[]
}

export interface DkimRecord {
  selector: string
  record: string
}

export interface EmailData {
  mx: MxRecord[]
  provider?: string
  spf: SpfAnalysis
  dmarc: DmarcAnalysis
  dkim: DkimRecord[]
  dkimSelectorsChecked: string[]
  mtaSts?: string
  tlsRpt?: string
  bimi?: string
}

// ---------------------------------------------------------------------------
// SSL / TLS
// ---------------------------------------------------------------------------
export interface CertSummary {
  subject: string
  issuer: string
  validFrom: string
  validTo: string
}

export interface SslData {
  reachable: boolean
  error?: string
  trusted?: boolean
  trustError?: string
  protocol?: string
  cipher?: string
  subject?: string
  issuer?: string
  validFrom?: string
  validTo?: string
  daysRemaining?: number
  altNames: string[]
  coversWww?: boolean
  keyBits?: number
  selfSigned?: boolean
  chain: CertSummary[]
}

// ---------------------------------------------------------------------------
// Web / HTTP
// ---------------------------------------------------------------------------
export interface RedirectHop {
  url: string
  status: number
}

export interface WebData {
  reachable: boolean
  error?: string
  finalUrl?: string
  status?: number
  httpsRedirect?: boolean
  redirects: RedirectHop[]
  server?: string
  poweredBy?: string
  hosting?: string
  technologies: string[]
  securityHeaders: Record<string, string | null>
  title?: string
  responseMs?: number
}

// ---------------------------------------------------------------------------
// Network / IP
// ---------------------------------------------------------------------------
export interface IpInfo {
  ip: string
  version: 4 | 6
  ptr?: string
  asn?: number
  asName?: string
  prefix?: string
  country?: string
  registry?: string
}

export interface NetworkData {
  ips: IpInfo[]
}

export interface SectionDataMap {
  registration: RegistrationData
  dns: DnsData
  email: EmailData
  ssl: SslData
  web: WebData
  network: NetworkData
}
