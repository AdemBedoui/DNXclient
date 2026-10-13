"use client"

import * as Tabs from "@radix-ui/react-tabs"
import { CalendarClock, CheckCircle2, Download, ExternalLink, Link as LinkIcon, Lock, Mail, RefreshCw, ShoppingCart } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { CATEGORY_LABEL } from "@/lib/dnx/score"
import type { Category, Finding } from "@/lib/dnx/types"
import { cn } from "@/lib/utils"
import { FindingList } from "./findings"
import { daysFrom, formatDate, Pill, Skeleton, SEVERITY_STYLE } from "./primitives"
import { ScoreRing } from "./score-ring"
import { DnsTab, EmailTab, SecurityTab, WebTab, WhoisTab } from "./tabs"
import { useReport, type ReportState } from "./use-report"

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "dns", label: "DNS" },
  { id: "email", label: "Email" },
  { id: "security", label: "Security" },
  { id: "web", label: "Website" },
  { id: "whois", label: "WHOIS" },
] as const

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
    <div className="space-y-6">
      {/* progress bar */}
      <div className={cn("fixed inset-x-0 top-0 z-50 h-0.5 transition-opacity", done && "opacity-0")}>
        <div className="h-full bg-brand transition-[width] duration-500" style={{ width: `${Math.max(8, progress * 100)}%` }} />
      </div>

      <Summary domain={domain} state={state} score={score} done={done} findings={findings} />

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={share}><LinkIcon /> Share</Button>
        <Button variant="outline" size="sm" onClick={exportJson} disabled={!done}><Download /> Export JSON</Button>
        <Button variant="outline" size="sm" onClick={rerun} disabled={!done}><RefreshCw className={cn(!done && "animate-spin")} /> Re-run</Button>
        <Button variant="ghost" size="sm" asChild>
          <a href={`https://${domain}`} target="_blank" rel="noopener noreferrer nofollow"><ExternalLink /> Visit site</a>
        </Button>
      </div>

      <Tabs.Root defaultValue="overview">
        <Tabs.List className="sticky top-0 z-30 -mx-4 flex gap-1 overflow-x-auto overflow-y-hidden [scrollbar-width:none] border-b bg-background/85 px-4 backdrop-blur sm:mx-0 sm:px-0" aria-label="Report sections">
          {TABS.map((t) => (
            <Tabs.Trigger
              key={t.id}
              value={t.id}
              className="relative shrink-0 rounded-md px-3 py-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring text-muted-foreground transition hover:text-foreground data-[state=active]:text-foreground data-[state=active]:after:absolute data-[state=active]:after:inset-x-2 data-[state=active]:after:-bottom-px data-[state=active]:after:h-0.5 data-[state=active]:after:rounded-full data-[state=active]:after:bg-brand"
            >
              {t.label}
              <TabBadge id={t.id} findings={findings} />
            </Tabs.Trigger>
          ))}
        </Tabs.List>
        <div className="pt-6">
          <Tabs.Content value="overview"><Overview findings={findings} done={done} /></Tabs.Content>
          <Tabs.Content value="dns"><DnsTab state={state} /></Tabs.Content>
          <Tabs.Content value="email"><EmailTab state={state} /></Tabs.Content>
          <Tabs.Content value="security"><SecurityTab state={state} /></Tabs.Content>
          <Tabs.Content value="web"><WebTab state={state} /></Tabs.Content>
          <Tabs.Content value="whois"><WhoisTab state={state} /></Tabs.Content>
        </div>
      </Tabs.Root>
    </div>
  )
}

const TAB_CATEGORIES: Record<string, Category[]> = {
  dns: ["dns"],
  email: ["email"],
  security: ["security"],
  web: ["web"],
  whois: ["registration"],
}

function TabBadge({ id, findings }: { id: string; findings: Finding[] }) {
  const cats = TAB_CATEGORIES[id]
  if (!cats) return null
  const issues = findings.filter((f) => cats.includes(f.category) && (f.severity === "fail" || f.severity === "warn"))
  if (!issues.length) return null
  const worst = issues.some((f) => f.severity === "fail") ? "fail" : "warn"
  return <span className={cn("ml-1.5 inline-grid min-w-4 place-items-center rounded px-1 text-[10px] font-semibold tabular-nums", SEVERITY_STYLE[worst].bg, SEVERITY_STYLE[worst].text)}>{issues.length}</span>
}

// ---------------------------------------------------------------------------
function Summary({ domain, state, score, done, findings }: { domain: string; state: ReportState; score: ReturnType<typeof useReport>["score"]; done: boolean; findings: Finding[] }) {
  const reg = state.registration.status === "done" ? state.registration.data : undefined
  const ssl = state.ssl.status === "done" ? state.ssl.data : undefined
  const email = state.email.status === "done" ? state.email.data : undefined
  const web = state.web.status === "done" ? state.web.data : undefined
  const expiresIn = daysFrom(reg?.expiresAt)

  return (
    <section className="relative overflow-hidden rounded-2xl border bg-card">
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-60 [mask-image:linear-gradient(to_left,black,transparent_60%)]" />
      <div className="relative flex flex-col gap-6 p-5 sm:p-7 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {reg ? (
              <Pill tone={reg.status === "registered" ? "pass" : "neutral"}>
                <CheckCircle2 className="size-3" /> {reg.status === "registered" ? "Registered" : "Status unknown"}
              </Pill>
            ) : (
              <Skeleton className="h-5 w-24" />
            )}
            {reg?.registrar && <span className="text-xs text-muted-foreground">via {reg.registrar}</span>}
          </div>
          <h1 className="font-mono text-2xl font-semibold tracking-tight break-all sm:text-4xl">{domain}</h1>
          {web?.title && <p className="line-clamp-1 text-sm text-muted-foreground">{web.title}</p>}

          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 pt-2 sm:grid-cols-4">
            <Stat icon={CalendarClock} label="Created" value={reg ? formatDate(reg.createdAt) ?? "—" : undefined} />
            <Stat
              icon={CalendarClock}
              label="Expires"
              value={reg ? (reg.expiresAt ? formatDate(reg.expiresAt) : "Not published") : undefined}
              tone={expiresIn !== undefined && expiresIn < 30 ? "warn" : undefined}
            />
            <Stat
              icon={Lock}
              label="SSL"
              value={ssl ? (ssl.reachable ? (ssl.daysRemaining! < 0 ? "Expired" : `${ssl.daysRemaining} days left`) : "None") : undefined}
              tone={ssl && (!ssl.reachable || !ssl.trusted || ssl.daysRemaining! < 0) ? "fail" : ssl && ssl.daysRemaining! < 14 ? "warn" : undefined}
            />
            <Stat icon={Mail} label="Email" value={email ? (email.provider ?? (email.mx.length ? "Custom" : "No mail")) : undefined} />
          </dl>
        </div>

        <div className="flex shrink-0 items-center gap-5">
          <div className="order-2 space-y-1 text-sm md:order-1">
            {(["fail", "warn", "info", "pass"] as const).map((s) => (
              <div key={s} className="flex items-center gap-2">
                <span className={cn("size-2 rounded-full", SEVERITY_STYLE[s].dot)} />
                <span className="w-20 text-muted-foreground">{SEVERITY_STYLE[s].label}</span>
                <span className="font-medium tabular-nums">{done || findings.length ? score.counts[s] : "–"}</span>
              </div>
            ))}
          </div>
          <div className="order-1 md:order-2">
            <ScoreRing score={score} loading={!done} />
          </div>
        </div>
      </div>
    </section>
  )
}

function Stat({ icon: Icon, label, value, tone }: { icon: typeof Lock; label: string; value?: string; tone?: "warn" | "fail" }) {
  return (
    <div>
      <dt className="flex items-center gap-1.5 text-xs text-muted-foreground"><Icon className="size-3" /> {label}</dt>
      <dd className={cn("mt-0.5 text-sm font-medium", tone && SEVERITY_STYLE[tone].text)}>{value ?? <Skeleton className="mt-1 h-4 w-20" />}</dd>
    </div>
  )
}

// ---------------------------------------------------------------------------
function Overview({ findings, done }: { findings: Finding[]; done: boolean }) {
  const issues = findings.filter((f) => f.severity === "fail" || f.severity === "warn")
  const tips = findings.filter((f) => f.severity === "info")
  const passed = findings.filter((f) => f.severity === "pass")

  const byCategory = (Object.keys(CATEGORY_LABEL) as Category[]).map((c) => {
    const fs = findings.filter((f) => f.category === c)
    const bad = fs.filter((f) => f.severity === "fail").length
    const warn = fs.filter((f) => f.severity === "warn").length
    return { c, total: fs.length, bad, warn, ok: fs.filter((f) => f.severity === "pass").length }
  })

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
      <div className="space-y-6">
        <Group title="Issues to fix" count={issues.length} empty={done ? "No issues found — nice work." : undefined}>
          <FindingList findings={issues} showCategory />
        </Group>
        <Group title="Recommendations" count={tips.length}>
          <FindingList findings={tips} showCategory />
        </Group>
        {passed.length > 0 && (
          <details className="group">
            <summary className="mb-3 cursor-pointer list-none text-sm font-medium text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
              <span className="mr-1 inline-block transition group-open:rotate-90">›</span> {passed.length} checks passed
            </summary>
            <FindingList findings={passed} showCategory />
          </details>
        )}
        {!done && <div className="space-y-2"><Skeleton className="h-12" /><Skeleton className="h-12" /><Skeleton className="h-12" /></div>}
      </div>

      <aside className="h-fit space-y-2 rounded-xl border bg-card p-4 lg:sticky lg:top-16">
        <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">By category</p>
        {byCategory.map(({ c, total, bad, warn, ok }) => (
          <div key={c} className="flex items-center justify-between gap-2 text-sm">
            <span>{CATEGORY_LABEL[c]}</span>
            {total === 0 ? (
              <span className="text-xs text-muted-foreground">—</span>
            ) : (
              <span className="flex gap-1.5 text-xs tabular-nums">
                {bad > 0 && <span className="text-fail">{bad}✕</span>}
                {warn > 0 && <span className="text-warn">{warn}!</span>}
                <span className="text-pass">{ok}✓</span>
              </span>
            )}
          </div>
        ))}
      </aside>
    </div>
  )
}

function Group({ title, count, empty, children }: { title: string; count: number; empty?: string; children: React.ReactNode }) {
  if (count === 0 && !empty) return null
  return (
    <div>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-medium">
        {title} <span className="rounded bg-muted px-1.5 text-xs text-muted-foreground tabular-nums">{count}</span>
      </h2>
      {count === 0 ? <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">{empty}</p> : children}
    </div>
  )
}

// ---------------------------------------------------------------------------
const SUGGESTED_TLDS = ["tn", "com.tn", "com", "net", "org"]

function AvailableView({ domain }: { domain: string }) {
  const name = domain.split(".")[0]
  return (
    <section className="relative overflow-hidden rounded-2xl border bg-card p-6 text-center sm:p-12">
      <div className="pointer-events-none absolute inset-0 glow-brand" />
      <div className="relative">
        <Pill tone="pass"><CheckCircle2 className="size-3" /> Available</Pill>
        <h1 className="mt-4 font-mono text-3xl font-semibold tracking-tight break-all sm:text-5xl">{domain}</h1>
        <p className="mx-auto mt-3 max-w-md text-muted-foreground">Good news — nobody has registered this domain yet. Grab it before someone else does.</p>
        <Button asChild size="lg" className="mt-8 bg-brand text-brand-foreground hover:bg-brand/90">
          <a href={`https://www.oxahost.com/domains/register?domain=${encodeURIComponent(domain)}`} target="_blank" rel="noopener">
            <ShoppingCart /> Register on Oxahost
          </a>
        </Button>
        <div className="mt-10">
          <p className="mb-3 text-xs text-muted-foreground">Also check</p>
          <div className="flex flex-wrap justify-center gap-2">
            {SUGGESTED_TLDS.map((t) => `${name}.${t}`).filter((d) => d !== domain).map((d) => (
              <a key={d} href={`/${d}`} className="rounded-md border px-3 py-1.5 font-mono text-sm transition hover:border-brand/50 hover:text-brand">{d}</a>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
