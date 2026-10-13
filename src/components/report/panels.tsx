"use client"

import { ArrowDown, Copy } from "lucide-react"
import { useMemo, useState } from "react"
import { toast } from "sonner"
import type { DnsData, EmailData, NetworkData, RegistrationData, SectionName, SslData, WebData } from "@/lib/dnx/types"
import { cn } from "@/lib/utils"
import { ageOf, CopyButton, daysFrom, ErrorNote, formatDate, KV, KVList, LinesSkeleton, MonoList, Panel, SubHead, Tag, ttl, type PanelStatus } from "./primitives"
import type { ReportState, SectionState } from "./use-report"

type Done<K extends SectionName> = Extract<SectionState<K>, { status: "done" }>

/** Panel that shows a skeleton / error until its section is loaded. */
function SectionPanel<K extends SectionName>({
  s,
  rows,
  children,
  ...panel
}: {
  s: SectionState<K>
  rows?: number
  children: (d: Done<K>["data"]) => React.ReactNode
} & Omit<React.ComponentProps<typeof Panel>, "children" | "status">) {
  return (
    <Panel {...panel} status={s.status as PanelStatus}>
      {s.status === "loading" ? <LinesSkeleton rows={rows} /> : s.status === "error" ? <ErrorNote message={s.error} /> : children((s as Done<K>).data)}
    </Panel>
  )
}

// ---------------------------------------------------------------------------
// 01 WHOIS
// ---------------------------------------------------------------------------
export function WhoisPanel({ state, className }: { state: ReportState; className?: string }) {
  return (
    <SectionPanel s={state.registration} code="01" title="WHOIS" rows={10} className={className} action={state.registration.status === "done" && <Tag>{state.registration.data.source}</Tag>}>
      {(d) => <Whois d={d} />}
    </SectionPanel>
  )
}

function Whois({ d }: { d: RegistrationData }) {
  const exp = daysFrom(d.expiresAt)
  return (
    <>
      <KVList>
        <KV label="Registrar">{d.registrar}</KV>
        <KV label="Created" mono>{d.createdAt ? `${formatDate(d.createdAt)}  · ${ageOf(d.createdAt)} ago` : undefined}</KV>
        <KV label="Updated" mono>{formatDate(d.updatedAt)}</KV>
        <KV label="Expires" mono>
          {d.expiresAt ? (
            <span className={cn(exp! < 30 && "text-warn", exp! < 0 && "text-fail")}>
              {formatDate(d.expiresAt)} · {exp! < 0 ? `${-exp!}d ago` : `in ${exp}d`}
            </span>
          ) : (
            <span className="text-muted-foreground">not published by registry</span>
          )}
        </KV>
        <KV label="DNSSEC" mono>{d.dnssec === undefined ? undefined : d.dnssec ? "signed" : "unsigned"}</KV>
      </KVList>

      {d.statuses.length > 0 && (
        <>
          <SubHead>Status</SubHead>
          <div className="flex flex-wrap gap-1">
            {d.statuses.map((s) => <Tag key={s} tone={/prohibited|active|ok/i.test(s) ? "pass" : /hold|redemption|pending/i.test(s) ? "warn" : "neutral"}>{s}</Tag>)}
          </div>
        </>
      )}

      <SubHead right={<span className="font-mono text-[10px] text-muted-foreground">{d.nameservers.length}</span>}>Name servers</SubHead>
      <MonoList items={d.nameservers} />

      <SubHead>Contacts</SubHead>
      {d.registrant || d.admin ? (
        <KVList>
          <KV label="Owner">{[d.registrant?.name, d.registrant?.organization].filter(Boolean).join(" · ") || undefined}</KV>
          <KV label="Owner country" mono>{d.registrant?.country}</KV>
          <KV label="Admin">{[d.admin?.name, d.admin?.organization].filter(Boolean).join(" · ") || undefined}</KV>
        </KVList>
      ) : (
        <p className="text-xs text-muted-foreground">Redacted or privacy-protected by the registry.</p>
      )}

      {d.raw && (
        <details className="group mt-4">
          <summary className="hud-label cursor-pointer list-none hover:text-brand [&::-webkit-details-marker]:hidden">
            <span className="inline-block transition group-open:rotate-90">▸</span> Raw WHOIS
          </summary>
          <pre className="mt-2 max-h-72 overflow-auto border border-line bg-background/50 p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-muted-foreground">{d.raw.trim()}</pre>
        </details>
      )}
    </>
  )
}

// ---------------------------------------------------------------------------
// 02 DNS zone
// ---------------------------------------------------------------------------
const TYPE_COLOR: Record<string, string> = {
  A: "text-brand border-brand/40",
  AAAA: "text-brand border-brand/40",
  CNAME: "text-info border-info/40",
  NS: "text-neon border-neon/40",
  MX: "text-pass border-pass/40",
  TXT: "text-warn border-warn/40",
  CAA: "text-fail border-fail/40",
  SOA: "text-muted-foreground border-line",
}

export function DnsPanel({ state, domain, className }: { state: ReportState; domain: string; className?: string }) {
  const s = state.dns
  return (
    <SectionPanel
      s={s}
      code="02"
      title="DNS zone"
      rows={14}
      className={className}
      bodyClassName="p-0"
      action={
        s.status === "done" && (
          <span className="font-mono text-[10.5px] text-muted-foreground">
            {s.data.records.length} records · DNSSEC <span className={s.data.dnssec.signed ? "text-pass" : ""}>{s.data.dnssec.signed ? "on" : "off"}</span>
          </span>
        )
      }
    >
      {(d) => <Zone d={d} domain={domain} />}
    </SectionPanel>
  )
}

function Zone({ d, domain }: { d: DnsData; domain: string }) {
  const [filter, setFilter] = useState<string>("ALL")
  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    for (const r of d.records) c[r.type] = (c[r.type] ?? 0) + 1
    return c
  }, [d.records])
  const rows = filter === "ALL" ? d.records : d.records.filter((r) => r.type === filter)
  const host = (name: string) => (name === domain ? "@" : name.endsWith(`.${domain}`) ? name.slice(0, -domain.length - 1) : name)

  function copyZone() {
    const zone = d.records.map((r) => `${r.name}.\t${r.ttl}\tIN\t${r.type}\t${r.type === "TXT" ? `"${r.value}"` : r.value}`).join("\n")
    navigator.clipboard.writeText(`; ${domain} — exported by DNX\n${zone}\n`).then(() => toast.success("Zone copied in BIND format"))
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-1 border-b border-line px-4 py-2">
        {["ALL", ...Object.keys(counts)].map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={cn(
              "border px-2 py-0.5 font-mono text-[10.5px] tracking-wider transition",
              filter === t ? "border-brand bg-brand/15 text-brand" : "border-line text-muted-foreground hover:text-foreground",
            )}
          >
            {t} <span className="opacity-60">{t === "ALL" ? d.records.length : counts[t]}</span>
          </button>
        ))}
        <button onClick={copyZone} className="ml-auto flex items-center gap-1.5 px-2 py-0.5 font-mono text-[10.5px] tracking-wider text-muted-foreground uppercase hover:text-brand">
          <Copy className="size-3" /> Copy zone
        </button>
      </div>
      <div className="max-h-[560px] flex-1 overflow-auto">
        <table className="w-full border-collapse text-left">
          <thead className="sticky top-0 z-10 bg-card/95 backdrop-blur">
            <tr className="hud-label">
              <th className="w-20 px-4 py-2 font-normal">Type</th>
              <th className="w-24 px-2 py-2 font-normal">Host</th>
              <th className="w-14 px-2 py-2 font-normal">TTL</th>
              <th className="px-2 py-2 font-normal">Value</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody className="font-mono text-[12.5px]">
            {rows.map((r, i) => (
              <tr key={i} className="group border-t border-line/60 align-top transition hover:bg-brand/5">
                <td className="px-4 py-1.5">
                  <span className={cn("inline-block min-w-11 border px-1 text-center text-[10.5px]", TYPE_COLOR[r.type] ?? "border-line")}>{r.type}</span>
                </td>
                <td className="px-2 py-1.5 text-muted-foreground">{host(r.name)}</td>
                <td className="px-2 py-1.5 text-muted-foreground">{ttl(r.ttl)}</td>
                <td className="px-2 py-1.5 break-all">{r.value}</td>
                <td className="pr-3 py-1">
                  <CopyButton value={r.value} />
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">No records</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// 03 Network
// ---------------------------------------------------------------------------
export function NetworkPanel({ state, className }: { state: ReportState; className?: string }) {
  const web = state.web.status === "done" ? state.web.data : undefined
  return (
    <SectionPanel s={state.network} code="03" title="Network" rows={6} className={className}>
      {(d) => <Network d={d} hosting={web?.hosting} />}
    </SectionPanel>
  )
}

const IPS_VISIBLE = 4

function Network({ d, hosting }: { d: NetworkData; hosting?: string }) {
  const [expanded, setExpanded] = useState(false)
  // Most multi-IP domains (CDNs, load balancers) sit in one network, so show
  // the network details once per ASN and the addresses as a compact list.
  const groups = useMemo(() => {
    const m = new Map<string, NetworkData["ips"]>()
    for (const ip of d.ips) {
      const key = ip.asn ? String(ip.asn) : "unknown"
      m.set(key, [...(m.get(key) ?? []), ip])
    }
    return [...m.values()]
  }, [d.ips])

  if (d.ips.length === 0) return <p className="font-mono text-xs text-muted-foreground">— domain does not resolve to an IP</p>

  // Cap the total number of addresses shown across all groups until expanded.
  const visibleByGroup: NetworkData["ips"][] = []
  let budget = expanded ? Infinity : IPS_VISIBLE
  for (const ips of groups) {
    visibleByGroup.push(ips.slice(0, budget))
    budget = Math.max(0, budget - ips.length)
  }

  return (
    <div className="space-y-4">
      {hosting && (
        <div className="flex items-center justify-between border border-brand/30 bg-brand/5 px-3 py-2">
          <span className="hud-label">Edge / host</span>
          <span className="font-display font-semibold tracking-wide text-brand">{hosting}</span>
        </div>
      )}
      {groups.map((ips, gi) => {
        const head = ips[0]
        const visible = visibleByGroup[gi]
        return (
          <div key={head.asn ?? head.ip}>
            <KVList>
              <KV label="Network">{head.asName ?? <span className="text-muted-foreground">unknown</span>}</KV>
              <KV label="ASN · Country" mono>{head.asn ? `AS${head.asn} · ${head.country ?? "—"} · ${head.registry ?? ""}` : undefined}</KV>
            </KVList>
            <SubHead right={<span className="font-mono text-[10px] text-muted-foreground">{ips.length}</span>}>Addresses</SubHead>
            <ul className="space-y-1">
              {visible.map((ip) => (
                <li key={ip.ip} className="group grid grid-cols-[auto_minmax(0,1fr)_auto] items-baseline gap-x-2 font-mono text-[12px]">
                  <span className="text-[10px] text-brand">v{ip.version}</span>
                  <span className="min-w-0 break-all">
                    {ip.ip}
                    <span className="block text-[10.5px] text-muted-foreground">
                      {ip.prefix}
                      {ip.ptr && ` · ${ip.ptr}`}
                    </span>
                  </span>
                  <CopyButton value={ip.ip} />
                </li>
              ))}
            </ul>
          </div>
        )
      })}
      {d.ips.length > IPS_VISIBLE && (
        <button onClick={() => setExpanded((e) => !e)} className="hud-label hover:text-brand">
          {expanded ? "▴ show less" : `▾ show all ${d.ips.length} addresses`}
        </button>
      )}
      {d.ips.every((ip) => !ip.ptr) && <p className="font-mono text-[10.5px] text-muted-foreground">No reverse DNS (PTR) set.</p>}
    </div>
  )
}

// ---------------------------------------------------------------------------
// 04 Propagation
// ---------------------------------------------------------------------------
export function PropagationPanel({ state, className }: { state: ReportState; className?: string }) {
  return (
    <SectionPanel s={state.dns} code="04" title="Propagation" rows={4} className={className}>
      {(d) => {
        const sets = new Set(d.propagation.filter((p) => p.ok).map((p) => [...p.A].sort().join(",")))
        return (
          <>
            <ul className="space-y-2">
              {d.propagation.map((p) => (
                <li key={p.resolver} className="flex items-start gap-3">
                  <span className={cn("glow-dot mt-1.5 size-1.5 shrink-0 rounded-full", !p.ok ? "bg-fail text-fail" : p.A.length ? "bg-pass text-pass" : "bg-warn text-warn")} />
                  <div className="w-24 shrink-0">
                    <div className="text-sm font-medium">{p.resolver}</div>
                    <div className="font-mono text-[10.5px] text-muted-foreground">{p.location}</div>
                  </div>
                  <div className="flex min-w-0 flex-1 flex-wrap justify-end gap-x-3 font-mono text-[12px]">
                    {!p.ok ? <span className="text-fail">timeout</span> : p.A.length ? [...p.A].sort().map((ip) => <span key={ip}>{ip}</span>) : <span className="text-muted-foreground">NXDOMAIN</span>}
                  </div>
                </li>
              ))}
            </ul>
            <p className={cn("mt-3 border-t border-line pt-2 font-mono text-[10.5px] tracking-wider uppercase", sets.size <= 1 ? "text-pass" : "text-warn")}>
              {sets.size <= 1 ? "✓ consistent across resolvers" : "≠ answers differ (CDN / propagating)"}
            </p>
          </>
        )
      }}
    </SectionPanel>
  )
}

// ---------------------------------------------------------------------------
// 05 TLS
// ---------------------------------------------------------------------------
export function TlsPanel({ state, className }: { state: ReportState; className?: string }) {
  const s = state.ssl
  const d = s.status === "done" ? s.data : undefined
  return (
    <SectionPanel
      s={s}
      code="05"
      title="TLS certificate"
      rows={8}
      className={className}
      action={d?.reachable && <Tag tone={!d.trusted || d.daysRemaining! < 0 ? "fail" : d.daysRemaining! < 14 ? "warn" : "pass"}>{!d.trusted ? "untrusted" : d.daysRemaining! < 0 ? "expired" : "trusted"}</Tag>}
    >
      {(d) => <Tls d={d} />}
    </SectionPanel>
  )
}

function Tls({ d }: { d: SslData }) {
  if (!d.reachable) return <p className="font-mono text-xs text-fail">! {d.error}</p>
  const total = new Date(d.validTo!).getTime() - new Date(d.validFrom!).getTime()
  const days = d.daysRemaining ?? 0
  const left = Math.min(1, Math.max(0, (days * 86_400_000) / total))
  const tone = days < 0 ? "bg-fail" : days < 14 ? "bg-warn" : "bg-pass"
  return (
    <>
      <div className="mb-4">
        <div className="mb-1.5 flex items-baseline justify-between">
          <span className="font-display text-3xl font-bold tabular-nums">{Math.max(days, 0)}</span>
          <span className="hud-label">days remaining</span>
        </div>
        <div className="flex h-1.5 gap-px">
          {Array.from({ length: 30 }, (_, i) => (
            <span key={i} className={cn("flex-1", i / 30 < left ? tone : "bg-line")} />
          ))}
        </div>
        <div className="mt-1 flex justify-between font-mono text-[10.5px] text-muted-foreground">
          <span>{formatDate(d.validFrom)}</span>
          <span>{formatDate(d.validTo)}</span>
        </div>
      </div>
      <KVList>
        <KV label="Subject" mono>{d.subject}</KV>
        <KV label="Issuer">{d.issuer}</KV>
        <KV label="Protocol" mono>{d.protocol}</KV>
        <KV label="Cipher" mono>{d.cipher}</KV>
        <KV label="Key" mono>{d.keyBits ? `${d.keyBits} bit` : undefined}</KV>
        <KV label="Covers www" mono>{d.coversWww ? "yes" : <span className="text-warn">no</span>}</KV>
        {d.trustError && <KV label="Trust error" mono><span className="text-fail">{d.trustError}</span></KV>}
      </KVList>
      <SubHead right={<span className="font-mono text-[10px] text-muted-foreground">{d.altNames.length}</span>}>SAN</SubHead>
      <div className="flex max-h-24 flex-wrap gap-1 overflow-auto">
        {d.altNames.map((n) => <span key={n} className="border border-line px-1 font-mono text-[10.5px]">{n}</span>)}
      </div>
      <SubHead>Chain</SubHead>
      <ol className="space-y-0.5">
        {d.chain.map((c, i) => (
          <li key={i} className="flex items-baseline gap-2 font-mono text-[11.5px]" style={{ paddingLeft: i * 10 }}>
            {i > 0 && <span className="text-brand">└</span>}
            <span>{c.subject}</span>
          </li>
        ))}
      </ol>
    </>
  )
}

// ---------------------------------------------------------------------------
// 06 Email authentication
// ---------------------------------------------------------------------------
export function EmailPanel({ state, className }: { state: ReportState; className?: string }) {
  const s = state.email
  return (
    <SectionPanel s={s} code="06" title="Email authentication" rows={9} className={className} action={s.status === "done" && s.data.provider && <Tag tone="brand">{s.data.provider}</Tag>}>
      {(d) => <Email d={d} />}
    </SectionPanel>
  )
}

function Email({ d }: { d: EmailData }) {
  const policyTone = d.dmarc.policy === "reject" || d.dmarc.policy === "quarantine" ? "pass" : d.dmarc.policy === "none" ? "warn" : "fail"
  const spfTone = !d.spf.record ? "fail" : d.spf.errors.length || /^\+?all$|^\?all$/i.test(d.spf.all ?? "") ? "warn" : "pass"
  return (
    <div className="grid gap-x-6 gap-y-2 md:grid-cols-2">
      <div className="min-w-0">
        <SubHead right={<span className="font-mono text-[10px] text-muted-foreground">{d.mx.length}</span>}>MX</SubHead>
        <MonoList items={d.mx.map((m) => `${String(m.priority).padStart(2, " ")}  ${m.exchange}`)} empty="no MX — domain does not receive mail" />

        <SubHead right={<Tag tone={spfTone}>{d.spf.record ? `${d.spf.lookups}/10 lookups` : "missing"}</Tag>}>SPF</SubHead>
        {d.spf.record ? (
          <>
            <MonoList items={[d.spf.record]} />
            <div className="mt-2 flex h-1 gap-px" title={`${d.spf.lookups} of 10 DNS lookups`}>
              {Array.from({ length: 10 }, (_, i) => (
                <span key={i} className={cn("flex-1", i < d.spf.lookups ? (d.spf.lookups > 10 ? "bg-fail" : d.spf.lookups > 8 ? "bg-warn" : "bg-brand") : "bg-line")} />
              ))}
            </div>
          </>
        ) : (
          <p className="font-mono text-xs text-muted-foreground/70">— no SPF record</p>
        )}
      </div>
      <div className="min-w-0">
        <SubHead right={<Tag tone={policyTone}>{d.dmarc.policy ? `p=${d.dmarc.policy}` : "missing"}</Tag>}>DMARC</SubHead>
        {d.dmarc.record ? (
          <>
            <MonoList items={[d.dmarc.record]} />
            <KVList className="mt-2">
              <KV label="Subdomains" mono>{d.dmarc.subdomainPolicy ?? "inherit"}</KV>
              <KV label="Coverage" mono>{`${d.dmarc.pct ?? 100}%`}</KV>
              <KV label="Reports" mono>{d.dmarc.rua.map((r) => r.replace(/^mailto:/, "")).join(", ") || "—"}</KV>
            </KVList>
          </>
        ) : (
          <p className="font-mono text-xs text-muted-foreground/70">— no DMARC record</p>
        )}

        <SubHead right={<span className="font-mono text-[10px] text-muted-foreground">{d.dkimSelectorsChecked.length} probed</span>}>DKIM</SubHead>
        {d.dkim.length ? (
          <ul className="space-y-1.5">
            {d.dkim.map((k) => (
              <li key={k.selector} className="group flex items-start gap-2 font-mono text-[12px]">
                <Tag tone="pass">{k.selector}</Tag>
                <span className="min-w-0 flex-1 truncate text-muted-foreground" title={k.record}>{k.record}</span>
                <CopyButton value={k.record} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="font-mono text-xs text-muted-foreground/70">— no key on common selectors</p>
        )}

        <SubHead>Transport</SubHead>
        <div className="flex flex-wrap gap-1.5">
          <Tag tone={d.mtaSts ? "pass" : "neutral"}>MTA-STS {d.mtaSts ? "on" : "off"}</Tag>
          <Tag tone={d.tlsRpt ? "pass" : "neutral"}>TLS-RPT {d.tlsRpt ? "on" : "off"}</Tag>
          <Tag tone={d.bimi ? "pass" : "neutral"}>BIMI {d.bimi ? "on" : "off"}</Tag>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// 07 Web
// ---------------------------------------------------------------------------
const HEADER_SHORT: Record<string, string> = {
  "strict-transport-security": "HSTS",
  "content-security-policy": "CSP",
  "x-frame-options": "X-Frame",
  "x-content-type-options": "X-CTO",
  "referrer-policy": "Referrer",
  "permissions-policy": "Permissions",
}

export function WebPanel({ state, className }: { state: ReportState; className?: string }) {
  const s = state.web
  return (
    <SectionPanel s={s} code="07" title="Web & headers" rows={9} className={className} action={s.status === "done" && s.data.status && <Tag tone={s.data.status < 400 ? "pass" : s.data.status < 500 ? "warn" : "fail"}>HTTP {s.data.status}</Tag>}>
      {(d) => <Web d={d} />}
    </SectionPanel>
  )
}

function Web({ d }: { d: WebData }) {
  if (!d.reachable) return <p className="font-mono text-xs text-warn">! {d.error}</p>
  const hops = [...d.redirects, { url: d.finalUrl!, status: d.status! }]
  return (
    <div className="grid gap-x-6 gap-y-2 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
      <div className="min-w-0">
        <KVList>
          <KV label="Title">{d.title}</KV>
          <KV label="Response" mono>{d.responseMs} ms</KV>
          <KV label="Server" mono>{d.server}</KV>
          <KV label="HTTPS" mono>{d.httpsRedirect ? <span className="text-pass">enforced</span> : <span className="text-fail">not enforced</span>}</KV>
        </KVList>
        <SubHead>Redirect chain</SubHead>
        <ol className="space-y-0.5 font-mono text-[11.5px]">
          {hops.map((h, i) => (
            <li key={i}>
              {i > 0 && <ArrowDown className="my-0.5 ml-3 size-3 text-brand" />}
              <div className="flex items-baseline gap-2">
                <span className={cn("w-8 shrink-0 text-center", h.status < 300 ? "text-pass" : "text-warn")}>{h.status}</span>
                <span className="min-w-0 break-all">{h.url}</span>
              </div>
            </li>
          ))}
        </ol>
        <SubHead>Stack</SubHead>
        {d.technologies.length ? (
          <div className="flex flex-wrap gap-1">{d.technologies.map((t) => <Tag key={t}>{t}</Tag>)}</div>
        ) : (
          <p className="font-mono text-xs text-muted-foreground/70">— nothing detected</p>
        )}
      </div>
      <div className="min-w-0">
        <SubHead right={<span className="font-mono text-[10px] text-muted-foreground">{Object.values(d.securityHeaders).filter(Boolean).length}/6</span>}>Security headers</SubHead>
        <ul className="space-y-1.5">
          {Object.entries(d.securityHeaders).map(([name, value]) => (
            <li key={name} className="group">
              <div className="flex items-center gap-2">
                <span className={cn("size-1.5 shrink-0", value ? "bg-pass" : "bg-fail/70")} />
                <span className="w-24 shrink-0 font-mono text-[11.5px]">{HEADER_SHORT[name]}</span>
                <span className={cn("line-clamp-2 min-w-0 flex-1 font-mono text-[11px] break-all", value ? "text-muted-foreground" : "text-fail/80")} title={value ?? undefined}>
                  {value ?? "missing"}
                </span>
                {value && <CopyButton value={value} />}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
