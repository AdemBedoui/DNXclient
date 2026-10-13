import "server-only"
import { lookup, lookupTxt } from "./doh"
import { parseMx } from "./dns"
import type { DkimRecord, DmarcAnalysis, EmailData, Finding, SpfAnalysis } from "./types"

const DKIM_SELECTORS = [
  "default", "google", "selector1", "selector2", "k1", "k2", "k3", "s1", "s2",
  "mail", "dkim", "smtp", "mx", "zoho", "zmail", "protonmail", "protonmail2",
  "mandrill", "mxvault", "everlytickey1", "cm", "sig1", "fm1", "fm2", "hs1", "hs2",
]

const PROVIDERS: [RegExp, string][] = [
  [/google\.com$|googlemail\.com$/, "Google Workspace"],
  [/outlook\.com$|protection\.outlook\.com$/, "Microsoft 365"],
  [/zoho\.(com|eu|in)$/, "Zoho Mail"],
  [/protonmail\.ch$/, "Proton Mail"],
  [/messagingengine\.com$/, "Fastmail"],
  [/mx\.cloudflare\.net$/, "Cloudflare Email Routing"],
  [/ovh\.net$/, "OVHcloud"],
  [/secureserver\.net$/, "GoDaddy"],
  [/mail\.ovh\.net$/, "OVHcloud"],
  [/yandex\.(net|ru)$/, "Yandex Mail"],
  [/icloud\.com$/, "iCloud Mail"],
  [/mimecast\.com$/, "Mimecast"],
  [/pphosted\.com$/, "Proofpoint"],
  [/titan\.email$/, "Titan Mail"],
  [/hostinger\.com$/, "Hostinger"],
  [/oxahost\./, "Oxahost"],
]

// ---------------------------------------------------------------------------
// SPF: count DNS-querying mechanisms recursively (RFC 7208 limit is 10).
// ---------------------------------------------------------------------------
async function analyzeSpf(domain: string): Promise<SpfAnalysis> {
  const txt = await lookupTxt(domain)
  const records = txt.filter((t) => /^v=spf1(\s|$)/i.test(t))
  const out: SpfAnalysis = { record: records[0], lookups: 0, includes: [], errors: [] }
  if (records.length === 0) return out
  if (records.length > 1) out.errors.push("Multiple SPF records found — receivers treat this as a permanent error.")

  out.all = records[0].match(/(?:^|\s)([+\-~?]?all)(?=\s|$)/i)?.[1]
  const seen = new Set<string>()

  async function walk(record: string, depth: number) {
    if (depth > 10) return
    for (const term of record.split(/\s+/).slice(1)) {
      const m =
        term.match(/^[+\-~?]?(include|exists|ptr|a|mx)(?:[:/](.*))?$/i) ?? term.match(/^(redirect)=(.*)$/i)
      if (!m) continue
      out.lookups++
      const mech = m[1].toLowerCase()
      const target = m[2] ?? ""
      if ((mech === "include" || mech === "redirect") && target && !seen.has(target)) {
        seen.add(target)
        if (depth === 0) out.includes.push(target)
        const sub = (await lookupTxt(target)).find((t) => /^v=spf1(\s|$)/i.test(t))
        if (sub) await walk(sub, depth + 1)
        else out.errors.push(`Included domain ${target} has no SPF record.`)
      }
    }
  }
  await walk(records[0], 0)
  if (out.lookups > 10) out.errors.push(`SPF needs ${out.lookups} DNS lookups; the limit is 10.`)
  return out
}

async function analyzeDmarc(domain: string): Promise<DmarcAnalysis> {
  const record = (await lookupTxt(`_dmarc.${domain}`)).find((t) => /^v=DMARC1/i.test(t))
  if (!record) return { rua: [] }
  const tags = Object.fromEntries(
    record.split(";").map((p) => p.trim().split("=").map((s) => s.trim())).filter((kv) => kv.length === 2),
  ) as Record<string, string>
  return {
    record,
    policy: tags.p?.toLowerCase(),
    subdomainPolicy: tags.sp?.toLowerCase(),
    pct: tags.pct ? Number(tags.pct) : undefined,
    rua: tags.rua ? tags.rua.split(",").map((s) => s.trim()) : [],
  }
}

async function findDkim(domain: string): Promise<DkimRecord[]> {
  const found = await Promise.all(
    DKIM_SELECTORS.map(async (selector) => {
      const name = `${selector}._domainkey.${domain}`
      const txt = (await lookupTxt(name)).find((t) => /v=DKIM1|k=rsa|k=ed25519|p=/i.test(t))
      if (txt) return { selector, record: txt }
      // Some providers (Microsoft 365) publish DKIM as a CNAME to their own zone.
      const cname = await lookup(name, "CNAME")
      return cname.length ? { selector, record: `CNAME → ${cname[0].replace(/\.$/, "")}` } : null
    }),
  )
  return found.filter((x): x is DkimRecord => x !== null)
}

export async function checkEmail(domain: string): Promise<{ data: EmailData; findings: Finding[] }> {
  const [mxRaw, spf, dmarc, dkim, mtaSts, tlsRpt, bimi] = await Promise.all([
    lookup(domain, "MX"),
    analyzeSpf(domain),
    analyzeDmarc(domain),
    findDkim(domain),
    lookupTxt(`_mta-sts.${domain}`).then((t) => t.find((x) => /^v=STSv1/i.test(x))),
    lookupTxt(`_smtp._tls.${domain}`).then((t) => t.find((x) => /^v=TLSRPTv1/i.test(x))),
    lookupTxt(`default._bimi.${domain}`).then((t) => t.find((x) => /^v=BIMI1/i.test(x))),
  ])

  const mx = parseMx(mxRaw)
  const provider = mx
    .map((m) => PROVIDERS.find(([re]) => re.test(m.exchange.toLowerCase()))?.[1])
    .find(Boolean)

  const data: EmailData = {
    mx,
    provider,
    spf,
    dmarc,
    dkim,
    dkimSelectorsChecked: DKIM_SELECTORS,
    mtaSts,
    tlsRpt,
    bimi,
  }
  return { data, findings: emailFindings(domain, data) }
}

function emailFindings(domain: string, d: EmailData): Finding[] {
  const f: Finding[] = []
  const c = "email" as const
  const nullMx = d.mx.length === 1 && (d.mx[0].exchange === "" || d.mx[0].exchange === ".")
  const receivesMail = d.mx.length > 0 && !nullMx

  if (!receivesMail) {
    f.push({ id: "mail-no-mx", category: c, severity: "info", title: "Domain does not receive email", detail: "No MX records were found." })
  } else {
    f.push({ id: "mail-mx", category: c, severity: "pass", title: d.provider ? `Email hosted by ${d.provider}` : `${d.mx.length} mail server${d.mx.length > 1 ? "s" : ""} configured` })
  }

  // SPF
  if (!d.spf.record) {
    f.push({ id: "spf-missing", category: c, severity: receivesMail ? "fail" : "warn", title: "No SPF record", detail: "Without SPF, anyone can send email that claims to come from this domain.", fix: receivesMail ? "Add a TXT record like: v=spf1 include:<your-mail-provider> ~all" : "If the domain never sends mail, publish: v=spf1 -all" })
  } else {
    for (const e of d.spf.errors) f.push({ id: `spf-err-${e.slice(0, 20)}`, category: c, severity: "fail", title: "SPF problem", detail: e, fix: "Merge records into one and flatten includes to stay within 10 lookups." })
    if (/^\+?all$/i.test(d.spf.all ?? "")) {
      f.push({ id: "spf-plusall", category: c, severity: "fail", title: "SPF allows every server (+all)", fix: "Replace +all with ~all or -all." })
    } else if (/^\?all$/i.test(d.spf.all ?? "")) {
      f.push({ id: "spf-neutral", category: c, severity: "warn", title: "SPF ends with ?all (neutral)", detail: "Receivers are told not to judge unlisted senders, so spoofed mail isn't penalized.", fix: "Change ?all to ~all (soft fail) or -all (hard fail)." })
    } else if (!d.spf.all) {
      f.push({ id: "spf-noall", category: c, severity: "warn", title: "SPF record has no 'all' mechanism", fix: "End the SPF record with ~all or -all." })
    } else if (d.spf.errors.length === 0) {
      f.push({ id: "spf-ok", category: c, severity: "pass", title: `SPF record valid (${d.spf.lookups}/10 lookups)` })
    }
  }

  // DMARC
  if (!d.dmarc.record) {
    f.push({ id: "dmarc-missing", category: c, severity: "fail", title: "No DMARC record", detail: "DMARC tells receivers what to do with mail that fails SPF/DKIM — without it, spoofed mail is often delivered.", fix: `Add a TXT record at _dmarc.${domain}: v=DMARC1; p=quarantine; rua=mailto:dmarc@${domain}` })
  } else if (d.dmarc.policy === "none") {
    f.push({ id: "dmarc-none", category: c, severity: "warn", title: "DMARC policy is p=none (monitoring only)", detail: "Spoofed emails are reported but still delivered.", fix: "Once reports look clean, move to p=quarantine, then p=reject." })
  } else {
    f.push({ id: "dmarc-ok", category: c, severity: "pass", title: `DMARC enforced (p=${d.dmarc.policy})` })
  }
  if (d.dmarc.record && d.dmarc.rua.length === 0) {
    f.push({ id: "dmarc-no-rua", category: c, severity: "info", title: "DMARC has no report address", fix: "Add rua=mailto:… so you receive aggregate reports about who sends as your domain." })
  }

  // DKIM
  if (receivesMail) {
    if (d.dkim.length) {
      f.push({ id: "dkim-ok", category: c, severity: "pass", title: `DKIM found (${d.dkim.map((k) => k.selector).join(", ")})` })
    } else {
      f.push({ id: "dkim-missing", category: c, severity: "warn", title: "No DKIM key found on common selectors", detail: `Checked ${d.dkimSelectorsChecked.length} common selectors. A custom selector may still exist.`, fix: "Enable DKIM signing in your email provider's admin panel and publish the DNS record it gives you." })
    }
    if (d.mtaSts) f.push({ id: "mta-sts", category: c, severity: "pass", title: "MTA-STS enabled" })
  }
  return f
}
