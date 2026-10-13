"use client"

import { CheckCircle2, Download, ExternalLink, Link as LinkIcon, RefreshCw, ShoppingCart } from "lucide-react"
import { toast } from "sonner"
import { CATEGORY_LABEL } from "@/lib/dnx/score"
import type { Category, Finding } from "@/lib/dnx/types"
import { cn } from "@/lib/utils"
import { FindingList } from "./findings"
import { DnsPanel, EmailPanel, NetworkPanel, PropagationPanel, TlsPanel, WebPanel, WhoisPanel } from "./panels"
import { ageOf, daysFrom, formatDate, Skeleton, SEVERITY_STYLE, Tag } from "./primitives"
import { ScoreRing } from "./score-ring"
import { useReport, type ReportState } from "./use-report"

export function Report({ domain }: { domain: string }) {
  const { state, findings, score, done, progress, rerun } = useReport(domain)
  const reg = state.registration

  if (reg.status === "done" && reg.data.status === "available") {
    return <AvailableView domain={domain} />
  }

  function exportJson() {
    const out = Object.fromEntries(Object.entries(state).map(([k, v]) => [k, v.status === "done" ? { data: v.data, findings: v.findings } : v]))
    const blob = new Blob([JSON.stringify({ domain, checkedAt: new Date().toISOString(), score, ...out }, null, 2)], { type: "application/json" })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = `dnx-${domain}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  async function share() {
    const url = window.location.href
    try {
      if (navigator.share) await navigator.share({ title: `DNX report for ${domain}`, url })
      else {
        await navigator.clipboard.writeText(url)
        toast.success("Link copied to clipboard")
      }
    } catch {}
  }

  return (
    <div className="space-y-4">
      <div className={cn("fixed inset-x-0 top-0 z-50 h-px transition-opacity", done && "opacity-0")}>
        <div className="h-full bg-brand shadow-[0_0_12px_var(--brand)] transition-[width] duration-500" style={{ width: `${Math.max(6, progress * 100)}%` }} />
      </div>

      <Telemetry domain={domain} state={state} score={score} done={done}>
        <ToolButton onClick={share} icon={LinkIcon}>Share</ToolButton>
        <ToolButton onClick={exportJson} icon={Download} disabled={!done}>JSON</ToolButton>
        <ToolButton onClick={rerun} icon={RefreshCw} disabled={!done} spin={!done}>Rescan</ToolButton>
        <a href={`https://${domain}`} target="_blank" rel="noopener noreferrer nofollow" className="flex items-center gap-1.5 border border-line px-2.5 py-1 font-mono text-[11px] tracking-wider text-muted-foreground uppercase transition hover:border-brand/50 hover:text-brand">
          <ExternalLink className="size-3" /> Visit
        </a>
      </Telemetry>

      {/* ---- Raw intelligence ---- */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-12">
        <WhoisPanel state={state} className="xl:col-span-3 xl:row-span-2" />
        <DnsPanel state={state} domain={domain} className="md:col-span-2 xl:col-span-6 xl:row-span-2" />
        <NetworkPanel state={state} className="xl:col-span-3" />
        <PropagationPanel state={state} className="xl:col-span-3" />
        <EmailPanel state={state} className="md:col-span-2 xl:col-span-5" />
        <TlsPanel state={state} className="xl:col-span-3" />
        <WebPanel state={state} className="md:col-span-1 xl:col-span-4" />
      </div>

      {/* ---- Analysis ---- */}
      <Analysis findings={findings} score={score} done={done} />
    </div>
  )
}

function ToolButton({ onClick, icon: Icon, children, disabled, spin }: { onClick: () => void; icon: typeof LinkIcon; children: React.ReactNode; disabled?: boolean; spin?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-1.5 border border-line px-2.5 py-1 font-mono text-[11px] tracking-wider text-muted-foreground uppercase transition hover:border-brand/50 hover:text-brand disabled:opacity-40 disabled:hover:border-line disabled:hover:text-muted-foreground"
    >
      <Icon className={cn("size-3", spin && "animate-spin")} /> {children}
    </button>
  )
}

// ---------------------------------------------------------------------------
type ScoreT = ReturnType<typeof useReport>["score"]

function Telemetry({ domain, state, score, done, children }: { domain: string; state: ReportState; score: ScoreT; done: boolean; children: React.ReactNode }) {
  const reg = state.registration.status === "done" ? state.registration.data : undefined
  const ssl = state.ssl.status === "done" ? state.ssl.data : undefined
  const email = state.email.status === "done" ? state.email.data : undefined
  const net = state.network.status === "done" ? state.network.data : undefined
  const web = state.web.status === "done" ? state.web.data : undefined
  const exp = daysFrom(reg?.expiresAt)
  const ip = net?.ips[0]

  const cells: { label: string; value?: React.ReactNode; tone?: string; loaded: boolean }[] = [
    { label: "Registrar", value: reg?.registrar ?? "—", loaded: !!reg },
    { label: "Age", value: reg?.createdAt ? ageOf(reg.createdAt) : "—", loaded: !!reg },
    { label: "Expires", value: reg?.expiresAt ? `${formatDate(reg.expiresAt)}` : "n/a", tone: exp !== undefined && exp < 30 ? "text-warn" : undefined, loaded: !!reg },
    { label: "IP", value: ip?.ip ?? "—", loaded: !!net },
    { label: "Network", value: ip?.asName?.split(/[ ,-]/)[0] || (ip?.asn ? `AS${ip.asn}` : "—"), loaded: !!net },
    { label: "Edge", value: web ? web.hosting ?? "direct" : undefined, loaded: !!web },
    { label: "TLS", value: ssl ? (ssl.reachable ? `${ssl.daysRemaining}d · ${ssl.protocol?.replace("TLSv", "v")}` : "none") : undefined, tone: ssl && (!ssl.reachable || !ssl.trusted) ? "text-fail" : undefined, loaded: !!ssl },
    { label: "Mail", value: email ? email.provider ?? (email.mx.length ? "custom" : "none") : undefined, loaded: !!email },
  ]

  return (
    <section className="hud overflow-hidden">
      <div className="flex flex-col gap-5 p-5 lg:flex-row lg:items-center lg:gap-8 lg:p-6">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {reg ? (
              <Tag tone={reg.status === "registered" ? "pass" : "neutral"}>
                <span className="glow-dot size-1 rounded-full bg-current" /> {reg.status}
              </Tag>
            ) : (
              <Tag tone="warn">scanning</Tag>
            )}
            <span className="hud-label">target</span>
          </div>
          <h1 className="font-display text-3xl font-bold tracking-wide break-all sm:text-5xl 2xl:text-6xl">{domain}</h1>
          {web?.title && <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{web.title}</p>}
          <div className="mt-4 flex flex-wrap gap-1.5">{children}</div>
        </div>

        <div className="grid flex-[1.6] grid-cols-2 border-t border-l border-line sm:grid-cols-4">
          {cells.map((c) => (
            <div key={c.label} className="min-w-0 border-r border-b border-line px-3 py-2.5">
              <div className="hud-label">{c.label}</div>
              {c.loaded ? (
                <div className={cn("mt-0.5 truncate font-mono text-[13px]", c.tone)} title={typeof c.value === "string" ? c.value : undefined}>{c.value}</div>
              ) : (
                <Skeleton className="mt-1.5 h-3.5 w-3/4" />
              )}
            </div>
          ))}
        </div>

        <a href="#analysis" className="flex shrink-0 items-center gap-4 self-center" aria-label="Jump to analysis">
          <ScoreRing score={score} loading={!done} />
        </a>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
function Analysis({ findings, score, done }: { findings: Finding[]; score: ScoreT; done: boolean }) {
  const issues = findings.filter((f) => f.severity === "fail" || f.severity === "warn")
  const tips = findings.filter((f) => f.severity === "info")
  const passed = findings.filter((f) => f.severity === "pass")

  return (
    <section id="analysis" className="scroll-mt-20 pt-6">
      <div className="mb-4 flex items-center gap-4">
        <span className="font-mono text-[10.5px] text-brand">08</span>
        <h2 className="font-display text-xl font-bold tracking-[0.14em] uppercase">Analysis & suggestions</h2>
        <span className="h-px flex-1 bg-gradient-to-r from-brand/50 to-transparent" />
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <aside className="hud p-5 xl:col-span-3">
          <div className="flex items-center gap-5">
            <ScoreRing score={score} loading={!done} size="lg" />
            <div className="space-y-1.5 text-sm">
              {(["fail", "warn", "info", "pass"] as const).map((s) => (
                <div key={s} className="flex items-center gap-2">
                  <span className={cn("glow-dot size-1.5 rounded-full", SEVERITY_STYLE[s].dot, SEVERITY_STYLE[s].text)} />
                  <span className="hud-label w-20">{SEVERITY_STYLE[s].label}</span>
                  <span className="font-mono tabular-nums">{score.counts[s]}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-6 space-y-3">
            {(Object.keys(CATEGORY_LABEL) as Category[]).map((c) => <CategoryBar key={c} category={c} findings={findings} />)}
          </div>
        </aside>

        <div className="space-y-4 xl:col-span-9">
          <div className="grid gap-4 lg:grid-cols-2">
            <Group title="Fix these" count={issues.length} tone="fail" empty={done ? "No issues found. Nice work." : undefined}>
              <FindingList findings={issues} showCategory />
            </Group>
            <Group title="Recommended" count={tips.length} tone="info" empty={done ? "Nothing to recommend." : undefined}>
              <FindingList findings={tips} showCategory />
            </Group>
          </div>
          {!done && <Skeleton className="h-24" />}
          {passed.length > 0 && (
            <details className="group">
              <summary className="hud-label mb-3 cursor-pointer list-none hover:text-pass [&::-webkit-details-marker]:hidden">
                <span className="inline-block transition group-open:rotate-90">▸</span> {passed.length} checks passed
              </summary>
              <FindingList findings={passed} showCategory className="lg:grid lg:grid-cols-2 lg:divide-y-0" />
            </details>
          )}
        </div>
      </div>
    </section>
  )
}

function CategoryBar({ category, findings }: { category: Category; findings: Finding[] }) {
  const fs = findings.filter((f) => f.category === category)
  const n = (s: string) => fs.filter((f) => f.severity === s).length
  return (
    <div>
      <div className="mb-1 flex justify-between">
        <span className="hud-label">{CATEGORY_LABEL[category]}</span>
        <span className="font-mono text-[10.5px] text-muted-foreground">{fs.length ? `${n("pass")}/${fs.length}` : "—"}</span>
      </div>
      <div className="flex h-1 gap-px bg-line">
        {(["fail", "warn", "info", "pass"] as const).map((s) => (n(s) ? <span key={s} className={SEVERITY_STYLE[s].dot} style={{ flex: n(s) }} /> : null))}
      </div>
    </div>
  )
}

function Group({ title, count, tone, empty, children }: { title: string; count: number; tone: "fail" | "info"; empty?: string; children: React.ReactNode }) {
  if (count === 0 && !empty) return null
  return (
    <div>
      <h3 className="mb-2 flex items-center gap-2">
        <span className={cn("size-1.5", SEVERITY_STYLE[tone].dot)} />
        <span className="font-display text-sm font-semibold tracking-[0.12em] uppercase">{title}</span>
        <span className="font-mono text-xs text-muted-foreground">[{count}]</span>
      </h3>
      {count === 0 ? <p className="border border-dashed border-line p-4 font-mono text-xs text-muted-foreground">{empty}</p> : children}
    </div>
  )
}

// ---------------------------------------------------------------------------
const SUGGESTED_TLDS = ["tn", "com.tn", "com", "net", "org", "io"]

function AvailableView({ domain }: { domain: string }) {
  const name = domain.split(".")[0]
  return (
    <section className="hud overflow-hidden px-6 py-16 text-center sm:py-24">
      <Tag tone="pass"><CheckCircle2 className="size-3" /> available</Tag>
      <h1 className="text-glow mt-6 font-display text-4xl font-bold tracking-wide break-all text-brand sm:text-7xl">{domain}</h1>
      <p className="mx-auto mt-4 max-w-lg text-muted-foreground">No registration found in the registry. This domain is free — claim it before someone else does.</p>
      <a
        href={`https://www.oxahost.com/domains/register?domain=${encodeURIComponent(domain)}`}
        target="_blank"
        rel="noopener"
        className="mt-10 inline-flex items-center gap-2 bg-brand px-6 py-3 font-mono text-sm font-semibold tracking-widest text-brand-foreground uppercase transition hover:shadow-[0_0_32px_-4px_var(--brand)]"
      >
        <ShoppingCart className="size-4" /> Register on Oxahost
      </a>
      <div className="mt-14">
        <p className="hud-label mb-3">Also scan</p>
        <div className="flex flex-wrap justify-center gap-2">
          {SUGGESTED_TLDS.map((t) => `${name}.${t}`).filter((d) => d !== domain).map((d) => (
            <a key={d} href={`/${d}`} className="border border-line bg-panel px-3 py-1.5 font-mono text-sm transition hover:border-brand/60 hover:text-brand">{d}</a>
          ))}
        </div>
      </div>
    </section>
  )
}
