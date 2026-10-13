import "server-only"
import { cached } from "./cache"
import { whoisQuery } from "./net"
import type { Contact, Finding, RegistrationData } from "./types"

// RDAP first (structured JSON, the modern WHOIS), raw port-43 WHOIS as fallback.
// .tn has no RDAP service, so it always goes through whois.ati.tn.

const WHOIS_OVERRIDES: Record<string, string> = {
  tn: "whois.ati.tn",
  "xn--pgbs0dh": "whois.ati.tn", // .تونس
}

const DAY = 86_400_000

async function rdapBootstrap(): Promise<Record<string, string>> {
  return cached("rdap-bootstrap", DAY, async () => {
    const res = await fetch("https://data.iana.org/rdap/dns.json", { signal: AbortSignal.timeout(5000) })
    const j = await res.json()
    const map: Record<string, string> = {}
    for (const [tlds, urls] of j.services as [string[], string[]][]) {
      for (const tld of tlds) map[tld] = urls[0]
    }
    return map
  })
}

async function whoisServerFor(tld: string): Promise<string | undefined> {
  if (WHOIS_OVERRIDES[tld]) return WHOIS_OVERRIDES[tld]
  return cached(`whois-server:${tld}`, DAY, async () => {
    const txt = await whoisQuery("whois.iana.org", tld)
    return txt.match(/^whois:\s*(\S+)/im)?.[1]
  })
}

// ---------------------------------------------------------------------------
// RDAP
// ---------------------------------------------------------------------------
type Vcard = [string, Record<string, unknown>, string, unknown][]
interface RdapEntity {
  roles?: string[]
  vcardArray?: [string, Vcard]
  entities?: RdapEntity[]
  publicIds?: { type: string; identifier: string }[]
}

function vcardContact(e?: RdapEntity): Contact | undefined {
  const card = e?.vcardArray?.[1]
  if (!card) return undefined
  const get = (k: string) => card.find((f) => f[0] === k)?.[3]
  const adr = card.find((f) => f[0] === "adr")
  const country =
    (adr?.[1] as { cc?: string })?.cc ?? (Array.isArray(adr?.[3]) ? (adr![3] as string[])[6] : undefined)
  const c: Contact = {
    name: (get("fn") as string) || undefined,
    organization: (get("org") as string) || undefined,
    email: (get("email") as string) || undefined,
    country: country || undefined,
  }
  return Object.values(c).some(Boolean) ? c : undefined
}

function findEntity(entities: RdapEntity[] | undefined, role: string): RdapEntity | undefined {
  for (const e of entities ?? []) {
    if (e.roles?.includes(role)) return e
    const nested = findEntity(e.entities, role)
    if (nested) return nested
  }
}

async function rdapLookup(domain: string, base: string): Promise<RegistrationData | null> {
  const url = `${base.replace(/\/?$/, "/")}domain/${domain}`
  const res = await fetch(url, {
    headers: { accept: "application/rdap+json" },
    signal: AbortSignal.timeout(7000),
  })
  if (res.status === 404) return { status: "available", source: "rdap", statuses: [], nameservers: [] }
  if (!res.ok) return null
  const j = await res.json()

  const event = (action: string) =>
    (j.events as { eventAction: string; eventDate: string }[] | undefined)?.find((e) => e.eventAction === action)
      ?.eventDate

  const registrar = findEntity(j.entities, "registrar")
  return {
    status: "registered",
    source: "rdap",
    registrar: vcardContact(registrar)?.name,
    createdAt: event("registration"),
    updatedAt: event("last changed"),
    expiresAt: event("expiration"),
    statuses: (j.status as string[] | undefined) ?? [],
    nameservers: ((j.nameservers as { ldhName: string }[] | undefined) ?? []).map((n) => n.ldhName.toLowerCase()),
    dnssec: j.secureDNS?.delegationSigned,
    registrant: vcardContact(findEntity(j.entities, "registrant")),
    admin: vcardContact(findEntity(j.entities, "administrative")),
  }
}

// ---------------------------------------------------------------------------
// WHOIS (port 43)
// ---------------------------------------------------------------------------
const NOT_FOUND = [
  /no object found/i,
  /no match for/i,
  /^not found/im,
  /no entries found/i,
  /no data found/i,
  /domain not found/i,
  /status:\s*(free|available)/i,
  /is available for/i,
  /no matching record/i,
]

function field(text: string, ...labels: string[]): string | undefined {
  for (const l of labels) {
    // Matches "Label: value" and ATI's "Label.........: value".
    const m = text.match(new RegExp(`^[ \\t]*${l}[ \\t]*\\.*[ \\t]*:[ \\t]*(.+)$`, "im"))
    const v = m?.[1].trim()
    if (v) return v
  }
}

function parseDate(s?: string): string | undefined {
  if (!s) return undefined
  // ATI: 05-12-2018 11:02:02 GMT+1
  const ati = s.match(/^(\d{2})-(\d{2})-(\d{4})\s+(\d{2}:\d{2}:\d{2})/)
  if (ati) return new Date(`${ati[3]}-${ati[2]}-${ati[1]}T${ati[4]}+01:00`).toISOString()
  const d = new Date(s)
  return isNaN(d.getTime()) ? s : d.toISOString()
}

function contactBlock(text: string, heading: string): Contact | undefined {
  const m = text.match(new RegExp(`${heading}([\\s\\S]*?)(?:\\n\\s*\\n|$)`, "i"))
  if (!m) return undefined
  const block = m[1]
  const name = [field(block, "Name"), field(block, "First name")].filter(Boolean).join(" ")
  const c: Contact = {
    name: name || undefined,
    country: field(block, "Country"),
    email: field(block, "Email"),
  }
  return Object.values(c).some(Boolean) ? c : undefined
}

export function parseWhois(text: string): RegistrationData {
  if (NOT_FOUND.some((r) => r.test(text))) {
    return { status: "available", source: "whois", statuses: [], nameservers: [], raw: text }
  }

  const statuses = [...text.matchAll(/^[ \t]*(?:Domain )?status[ \t]*\.*[ \t]*:[ \t]*(.+)$/gim)]
    .map((m) => m[1].trim().split(/\s+/)[0])
    .filter(Boolean)

  const nsInline = [...text.matchAll(/^[ \t]*Name Server[ \t]*\.*[ \t]*:[ \t]*(\S+)/gim)].map((m) => m[1])
  const nsBlock = text.match(/DNS servers\s*\n([\s\S]*?)(?:\n\s*\n|$)/i)?.[1]
  const nsAti = nsBlock ? [...nsBlock.matchAll(/Name\s*\.*\s*:\s*(\S+)/gi)].map((m) => m[1]) : []
  const nameservers = [...new Set([...nsInline, ...nsAti].map((n) => n.toLowerCase().replace(/\.$/, "")))]

  const dnssec = field(text, "DNSSEC", "dnssec")

  return {
    status: "registered",
    source: "whois",
    registrar: field(text, "Registrar", "Sponsoring Registrar", "Registrar Name"),
    createdAt: parseDate(field(text, "Creation date", "Created On", "Created", "Registration Date", "Registered on")),
    updatedAt: parseDate(field(text, "Updated Date", "Last Modified", "Last updated")),
    expiresAt: parseDate(
      field(text, "Registry Expiry Date", "Registrar Registration Expiration Date", "Expiry Date", "Expiration Date", "Expires On", "paid-till"),
    ),
    statuses: [...new Set(statuses)],
    nameservers,
    dnssec: dnssec ? !/unsigned|no|inactive/i.test(dnssec) : undefined,
    registrant: contactBlock(text, "Owner Contact") ?? contactBlock(text, "Registrant"),
    admin: contactBlock(text, "Administrativ contact") ?? contactBlock(text, "Admin(?:istrative)? Contact"),
    raw: text,
  }
}

// ---------------------------------------------------------------------------
export async function checkRegistration(domain: string): Promise<{ data: RegistrationData; findings: Finding[] }> {
  const tld = domain.split(".").pop()!
  let data: RegistrationData | null = null

  try {
    const base = (await rdapBootstrap())[tld]
    if (base && !WHOIS_OVERRIDES[tld]) data = await rdapLookup(domain, base)
  } catch {
    data = null
  }

  if (!data) {
    try {
      const server = await whoisServerFor(tld)
      if (server) data = parseWhois(await whoisQuery(server, domain))
    } catch {
      data = null
    }
  }

  data ??= { status: "unknown", source: "none", statuses: [], nameservers: [] }
  return { data, findings: registrationFindings(data) }
}

function registrationFindings(d: RegistrationData): Finding[] {
  const f: Finding[] = []
  if (d.status !== "registered") return f

  if (d.expiresAt) {
    const days = Math.floor((new Date(d.expiresAt).getTime() - Date.now()) / DAY)
    if (days < 0) {
      f.push({ id: "reg-expired", category: "registration", severity: "fail", title: "Domain registration has expired", fix: "Renew the domain with your registrar immediately before it is released." })
    } else if (days < 30) {
      f.push({ id: "reg-expiring", category: "registration", severity: "warn", title: `Domain expires in ${days} days`, fix: "Renew the domain soon and enable auto-renew at your registrar." })
    } else {
      f.push({ id: "reg-expiry-ok", category: "registration", severity: "pass", title: `Domain registered until ${d.expiresAt.slice(0, 10)}` })
    }
  }

  const s = d.statuses.map((x) => x.toLowerCase().replace(/[\s_]/g, ""))
  if (s.some((x) => x.includes("hold"))) {
    f.push({ id: "reg-hold", category: "registration", severity: "fail", title: "Domain is on hold", detail: "A hold status removes the domain from DNS, so the site and email stop working.", fix: "Contact your registrar to find out why the domain was put on hold." })
  }
  if (s.some((x) => x.includes("redemption") || x.includes("pendingdelete"))) {
    f.push({ id: "reg-redemption", category: "registration", severity: "fail", title: "Domain is pending deletion", fix: "Restore the domain through your registrar right away — it can still be recovered during the redemption period." })
  }
  if (s.some((x) => x.includes("transferprohibited"))) {
    f.push({ id: "reg-lock", category: "registration", severity: "pass", title: "Transfer lock is enabled" })
  } else if (d.source === "rdap") {
    f.push({ id: "reg-nolock", category: "registration", severity: "info", title: "Transfer lock is not enabled", fix: "Enable the registrar lock to protect the domain from unauthorized transfers." })
  }
  return f
}
