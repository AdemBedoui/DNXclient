"use client"

import { ArrowRight, AtSign, Cpu, FileKey2, Globe, KeyRound, Link2, Lock, Mail, Network, Radar, Server, ShieldCheck, User } from "lucide-react"
import type { DnsData, EmailData, Finding, NetworkData, RegistrationData, SectionName, SslData, WebData } from "@/lib/dnx/types"
import { cn } from "@/lib/utils"
import { FindingList } from "./findings"
import { daysFrom, ErrorNote, formatDate, KV, KVList, Panel, PanelSkeleton, Pill, RecordList, SEVERITY_STYLE } from "./primitives"
import type { ReportState, SectionState } from "./use-report"

type Done<K extends SectionName> = Extract<SectionState<K>, { status: "done" }>

/** Renders skeleton/error until the section is done. */
function Gate<K extends SectionName>({ s, rows, children }: { s: SectionState<K>; rows?: number; children: (d: Done<K>) => React.ReactNode }) {
  if (s.status === "loading") return <PanelSkeleton rows={rows} />
  if (s.status === "error") return <ErrorNote message={s.error} />
  return <>{children(s as Done<K>)}</>
}

function SectionFindings({ findings }: { findings: Finding[] }) {
  const relevant = findings.filter((f) => f.severity !== "pass")
  const passed = findings.filter((f) => f.severity === "pass")
  if (findings.length === 0) return null
  return <FindingList findings={[...relevant, ...passed]} />
}

// ---------------------------------------------------------------------------
export function DnsTab({ state }: { state: ReportState }) {
  return (
    <div className="space-y-6">
      <Gate s={state.dns} rows={8}>
        {({ data, findings }) => (
          <>
            <SectionFindings findings={findings} />
            <DnsRecords d={data} />
            <Propagation d={data} />
          </>
        )}
      </Gate>
      <Gate s={state.network} rows={3}>
        {({ data, findings }) => <NetworkPanel d={data} findings={findings} />}
      </Gate>
    </div>
  )
}

function DnsRecords({ d }: { d: DnsData }) {
  return (
    <Panel title="DNS records" icon={Server}>
      <div className="grid gap-5 lg:grid-cols-2">
        <RecordList label="A" records={d.A} />
        <RecordList label="AAAA" records={d.AAAA} />
        <RecordList label="NS" records={d.NS} />
        <RecordList label="MX" records={d.MX.map((m) => `${m.priority}  ${m.exchange}`)} />
        {d.CNAME.length > 0 && <RecordList label="CNAME" records={d.CNAME} />}
        <RecordList label="CAA" records={d.CAA} />
        <div className="lg:col-span-2">
          <RecordList label="TXT" records={d.TXT} />
        </div>
        {d.SOA && (
          <div className="lg:col-span-2">
            <RecordList label="SOA" records={[d.SOA]} />
          </div>
        )}
      </div>
    </Panel>
  )
}

function Propagation({ d }: { d: DnsData }) {
  return (
    <Panel
      title="Propagation"
      icon={Radar}
      action={
        <span className="text-xs text-muted-foreground">
          DNSSEC:{" "}
          <span className={d.dnssec.signed ? "text-pass" : ""}>{d.dnssec.signed ? (d.dnssec.validated ? "signed & validated" : "signed") : "off"}</span>
        </span>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {d.propagation.map((p) => (
          <div key={p.resolver} className="rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{p.resolver}</span>
              <span className={cn("size-2 rounded-full", !p.ok ? "bg-fail" : p.A.length ? "bg-pass" : "bg-warn")} />
            </div>
            <div className="mb-2 font-mono text-[11px] text-muted-foreground">{p.location}</div>
            <div className="space-y-0.5 font-mono text-xs">
              {!p.ok ? <span className="text-fail">no response</span> : p.A.length ? p.A.map((ip) => <div key={ip}>{ip}</div>) : <span className="text-muted-foreground">no A record</span>}
            </div>
          </div>
        ))}
      </div>
    </Panel>
  )
}

function NetworkPanel({ d, findings }: { d: NetworkData; findings: Finding[] }) {
  if (d.ips.length === 0) return null
  return (
    <Panel title="Network" icon={Network}>
      <div className="space-y-4">
        {d.ips.map((ip) => (
          <div key={ip.ip} className="grid gap-x-6 gap-y-1 rounded-lg border p-4 sm:grid-cols-2">
            <KVList>
              <KV label={`IPv${ip.version}`} mono>{ip.ip}</KV>
              <KV label="Reverse DNS" mono>{ip.ptr ?? <span className="text-muted-foreground">none</span>}</KV>
            </KVList>
            <KVList>
              <KV label="Network">{ip.asName}</KV>
              <KV label="ASN / prefix" mono>{ip.asn ? `AS${ip.asn} · ${ip.prefix}` : undefined}</KV>
              <KV label="Country / RIR">{ip.country ? `${ip.country} · ${ip.registry}` : undefined}</KV>
            </KVList>
          </div>
        ))}
        {findings.length > 0 && <FindingList findings={findings} />}
      </div>
    </Panel>
  )
}

// ---------------------------------------------------------------------------
export function EmailTab({ state }: { state: ReportState }) {
  return (
    <Gate s={state.email} rows={8}>
      {({ data, findings }) => (
        <div className="space-y-6">
          <SectionFindings findings={findings} />
          <EmailDetails d={data} />
        </div>
      )}
    </Gate>
  )
}

function EmailDetails({ d }: { d: EmailData }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Panel title="Mail servers" icon={Mail} action={d.provider && <Pill tone="neutral">{d.provider}</Pill>}>
        <RecordList label="MX" records={d.mx.map((m) => `${m.priority}  ${m.exchange}`)} empty="No MX records — this domain doesn't receive email." />
      </Panel>

      <Panel title="SPF" icon={AtSign} action={d.spf.record && <Pill tone={d.spf.lookups > 10 ? "fail" : "neutral"}>{d.spf.lookups}/10 lookups</Pill>}>
        {d.spf.record ? (
          <div className="space-y-3">
            <RecordList label="TXT" records={[d.spf.record]} />
            <KVList>
              <KV label="Policy for others" mono>{d.spf.all ?? "not set"}</KV>
              <KV label="Includes" mono>{d.spf.includes.join(", ") || "—"}</KV>
            </KVList>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No SPF record published.</p>
        )}
      </Panel>

      <Panel title="DMARC" icon={ShieldCheck} action={d.dmarc.policy && <Pill tone={d.dmarc.policy === "none" ? "warn" : "pass"}>p={d.dmarc.policy}</Pill>}>
        {d.dmarc.record ? (
          <div className="space-y-3">
            <RecordList label="TXT" records={[d.dmarc.record]} />
            <KVList>
              <KV label="Policy">{DMARC_POLICY[d.dmarc.policy ?? ""] ?? d.dmarc.policy}</KV>
              <KV label="Subdomains">{d.dmarc.subdomainPolicy ? DMARC_POLICY[d.dmarc.subdomainPolicy] ?? d.dmarc.subdomainPolicy : "Same as domain"}</KV>
              <KV label="Applied to">{d.dmarc.pct !== undefined ? `${d.dmarc.pct}% of mail` : "100% of mail"}</KV>
              <KV label="Reports sent to" mono>{d.dmarc.rua.map((r) => r.replace(/^mailto:/, "")).join(", ") || "—"}</KV>
            </KVList>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No DMARC record published.</p>
        )}
      </Panel>

      <Panel title="DKIM" icon={KeyRound} action={<span className="text-xs text-muted-foreground">{d.dkimSelectorsChecked.length} selectors checked</span>}>
        {d.dkim.length ? (
          <div className="space-y-4">
            {d.dkim.map((k) => (
              <RecordList key={k.selector} label={`${k.selector}._domainkey`} records={[k.record]} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No DKIM key found on common selectors.</p>
        )}
      </Panel>

      <Panel title="Advanced" icon={FileKey2} className="lg:col-span-2">
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            ["MTA-STS", d.mtaSts, "Forces encrypted delivery to your mail servers."],
            ["TLS-RPT", d.tlsRpt, "Reports TLS delivery failures to you."],
            ["BIMI", d.bimi, "Shows your logo next to emails in supporting inboxes."],
          ].map(([name, rec, desc]) => (
            <div key={name} className="rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{name}</span>
                <Pill tone={rec ? "pass" : "neutral"}>{rec ? "Enabled" : "Not set"}</Pill>
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  )
}

const DMARC_POLICY: Record<string, string> = {
  none: "Monitor only — failing mail is delivered",
  quarantine: "Quarantine — failing mail goes to spam",
  reject: "Reject — failing mail is blocked",
}

// ---------------------------------------------------------------------------
export function SecurityTab({ state }: { state: ReportState }) {
  const webSecurity = state.web.status === "done" ? state.web.findings.filter((f) => f.category === "security") : []
  return (
    <div className="space-y-6">
      <Gate s={state.ssl} rows={6}>
        {({ data, findings }) => (
          <>
            <SectionFindings findings={[...findings, ...webSecurity]} />
            <SslPanel d={data} />
          </>
        )}
      </Gate>
      <Gate s={state.web} rows={6}>
        {({ data }) => <HeadersPanel d={data} />}
      </Gate>
    </div>
  )
}

function SslPanel({ d }: { d: SslData }) {
  if (!d.reachable) {
    return (
      <Panel title="SSL certificate" icon={Lock}>
        <p className="text-sm text-muted-foreground">{d.error}</p>
      </Panel>
    )
  }
  const total = d.validFrom && d.validTo ? new Date(d.validTo).getTime() - new Date(d.validFrom).getTime() : 1
  const days = d.daysRemaining ?? 0
  const used = Math.min(1, Math.max(0, 1 - (days * 86_400_000) / total))
  const tone: "fail" | "warn" | "pass" = days < 0 ? "fail" : days < 14 ? "warn" : "pass"
  return (
    <Panel title="SSL certificate" icon={Lock} action={<Pill tone={d.trusted ? tone : "fail"}>{d.trusted ? (days < 0 ? "Expired" : "Trusted") : "Untrusted"}</Pill>}>
      <div className="mb-5">
        <div className="mb-2 flex justify-between text-xs text-muted-foreground">
          <span>Issued {formatDate(d.validFrom)}</span>
          <span className={cn("font-medium", SEVERITY_STYLE[tone].text)}>{days < 0 ? `Expired ${-days} days ago` : `${days} days left`}</span>
          <span>Expires {formatDate(d.validTo)}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div className={cn("h-full rounded-full", SEVERITY_STYLE[tone].dot)} style={{ width: `${used * 100}%` }} />
        </div>
      </div>
      <div className="grid gap-x-8 lg:grid-cols-2">
        <KVList>
          <KV label="Issued to" mono>{d.subject}</KV>
          <KV label="Issuer">{d.issuer}</KV>
          <KV label="Protocol" mono>{d.protocol}</KV>
          <KV label="Cipher" mono>{d.cipher}</KV>
          <KV label="Key size">{d.keyBits ? `${d.keyBits} bits` : undefined}</KV>
          {d.trustError && <KV label="Trust error">{d.trustError}</KV>}
        </KVList>
        <div className="space-y-4 pt-2">
          <div>
            <p className="mb-2 text-xs text-muted-foreground">Covered names ({d.altNames.length})</p>
            <div className="flex flex-wrap gap-1.5">
              {d.altNames.slice(0, 30).map((n) => (
                <span key={n} className="rounded border px-1.5 py-0.5 font-mono text-[11px]">{n}</span>
              ))}
              {d.altNames.length > 30 && <span className="text-xs text-muted-foreground">+{d.altNames.length - 30} more</span>}
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs text-muted-foreground">Chain</p>
            <ol className="space-y-1">
              {d.chain.map((c, i) => (
                <li key={i} className="flex items-center gap-2 text-xs" style={{ paddingLeft: i * 12 }}>
                  <Link2 className="size-3 shrink-0 text-muted-foreground" />
                  <span className="font-mono">{c.subject}</span>
                  <span className="text-muted-foreground">· {c.issuer}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </Panel>
  )
}

const HEADER_INFO: Record<string, string> = {
  "strict-transport-security": "Forces HTTPS on return visits",
  "content-security-policy": "Restricts where scripts and content load from",
  "x-frame-options": "Prevents clickjacking via iframes",
  "x-content-type-options": "Stops MIME-type sniffing",
  "referrer-policy": "Controls what URL is sent to other sites",
  "permissions-policy": "Limits access to camera, mic, location…",
}

function HeadersPanel({ d }: { d: WebData }) {
  if (!d.reachable) return null
  return (
    <Panel title="Security headers" icon={ShieldCheck}>
      <ul className="divide-y rounded-lg border">
        {Object.entries(d.securityHeaders).map(([name, value]) => (
          <li key={name} className="grid gap-1 px-3 py-2.5 sm:grid-cols-[220px_1fr] sm:gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className={cn("size-1.5 rounded-full", value ? "bg-pass" : "bg-muted-foreground/40")} />
                <span className="font-mono text-xs font-medium">{name}</span>
              </div>
              <p className="mt-0.5 pl-3.5 text-[11px] text-muted-foreground">{HEADER_INFO[name]}</p>
            </div>
            <code className={cn("font-mono text-xs break-all", !value && "text-muted-foreground italic")}>
              {value ? (value.length > 300 ? `${value.slice(0, 300)}…` : value) : "not set"}
            </code>
          </li>
        ))}
      </ul>
    </Panel>
  )
}

// ---------------------------------------------------------------------------
export function WebTab({ state }: { state: ReportState }) {
  return (
    <Gate s={state.web} rows={6}>
      {({ data, findings }) => (
        <div className="space-y-6">
          <SectionFindings findings={findings.filter((f) => f.category === "web")} />
          {data.reachable ? <WebDetails d={data} /> : <Panel title="Website" icon={Globe}><p className="text-sm text-muted-foreground">{data.error}</p></Panel>}
        </div>
      )}
    </Gate>
  )
}

function WebDetails({ d }: { d: WebData }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Panel title="Response" icon={Globe}>
        <KVList>
          <KV label="Final URL" mono>
            <a href={d.finalUrl} target="_blank" rel="noopener noreferrer nofollow" className="text-brand underline-offset-4 hover:underline">{d.finalUrl}</a>
          </KV>
          <KV label="Page title">{d.title}</KV>
          <KV label="HTTP status" mono>{d.status}</KV>
          <KV label="Response time">{d.responseMs !== undefined ? `${d.responseMs} ms` : undefined}</KV>
          <KV label="Server" mono>{d.server}</KV>
        </KVList>
        {d.redirects.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-xs text-muted-foreground">Redirect chain</p>
            <ol className="space-y-1.5 font-mono text-xs">
              {[...d.redirects, { url: d.finalUrl!, status: d.status! }].map((h, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className={cn("w-9 shrink-0 rounded px-1 text-center", h.status < 300 ? "bg-pass/10 text-pass" : "bg-muted")}>{h.status}</span>
                  {i > 0 && <ArrowRight className="size-3 shrink-0 text-muted-foreground" />}
                  <span className="break-all">{h.url}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </Panel>
      <Panel title="Hosting & technology" icon={Cpu}>
        <KVList>
          <KV label="Hosting / CDN">{d.hosting ?? <span className="text-muted-foreground">Not detected</span>}</KV>
          <KV label="Powered by" mono>{d.poweredBy}</KV>
        </KVList>
        <p className="mt-4 mb-2 text-xs text-muted-foreground">Detected technologies</p>
        {d.technologies.length ? (
          <div className="flex flex-wrap gap-1.5">
            {d.technologies.map((t) => (
              <span key={t} className="rounded-md border bg-muted/40 px-2 py-1 text-xs">{t}</span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">None detected.</p>
        )}
      </Panel>
    </div>
  )
}

// ---------------------------------------------------------------------------
export function WhoisTab({ state }: { state: ReportState }) {
  return (
    <Gate s={state.registration} rows={8}>
      {({ data, findings }) => (
        <div className="space-y-6">
          <SectionFindings findings={findings} />
          <WhoisDetails d={data} />
        </div>
      )}
    </Gate>
  )
}

function WhoisDetails({ d }: { d: RegistrationData }) {
  const expiresIn = daysFrom(d.expiresAt)
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Panel title="Registration" icon={FileKey2} action={<span className="text-xs text-muted-foreground uppercase">via {d.source}</span>}>
        <KVList>
          <KV label="Registrar">{d.registrar}</KV>
          <KV label="Created">{formatDate(d.createdAt)}</KV>
          <KV label="Updated">{formatDate(d.updatedAt)}</KV>
          <KV label="Expires">{d.expiresAt ? `${formatDate(d.expiresAt)} (${expiresIn} days)` : undefined}</KV>
          <KV label="DNSSEC">{d.dnssec === undefined ? undefined : d.dnssec ? "Signed" : "Unsigned"}</KV>
          <KV label="Status">
            {d.statuses.length ? (
              <div className="flex flex-wrap gap-1">
                {d.statuses.map((s) => <span key={s} className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">{s}</span>)}
              </div>
            ) : undefined}
          </KV>
        </KVList>
        {d.nameservers.length > 0 && <div className="mt-4"><RecordList label="Name servers" records={d.nameservers} /></div>}
      </Panel>
      <Panel title="Contacts" icon={User}>
        {d.registrant || d.admin ? (
          <div className="space-y-4">
            {[["Owner", d.registrant], ["Administrative", d.admin]].map(([label, c]) =>
              c && typeof c === "object" ? (
                <div key={label as string}>
                  <p className="mb-1 text-xs font-medium text-muted-foreground">{label as string}</p>
                  <KVList>
                    <KV label="Name">{c.name}</KV>
                    <KV label="Organization">{c.organization}</KV>
                    <KV label="Country">{c.country}</KV>
                  </KVList>
                </div>
              ) : null,
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Contact details are not public for this domain (privacy-protected or redacted by the registry).</p>
        )}
      </Panel>
      {d.raw && (
        <details className="group rounded-xl border bg-card lg:col-span-2">
          <summary className="cursor-pointer px-5 py-3 text-sm font-medium">Raw WHOIS response</summary>
          <pre className="max-h-96 overflow-auto border-t p-5 font-mono text-xs leading-relaxed whitespace-pre-wrap text-muted-foreground">{d.raw.trim()}</pre>
        </details>
      )}
    </div>
  )
}
