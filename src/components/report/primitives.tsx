"use client"

import { AlertTriangle, Check, CheckCircle2, Copy, Info, XCircle } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import type { Severity } from "@/lib/dnx/types"
import { cn } from "@/lib/utils"

export type PanelStatus = "loading" | "done" | "error"

export function Panel({
  code,
  title,
  status = "done",
  action,
  children,
  className,
  bodyClassName,
}: {
  code: string
  title: string
  status?: PanelStatus
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
  bodyClassName?: string
}) {
  return (
    <section className={cn("hud flex min-w-0 flex-col", className)} aria-busy={status === "loading"}>
      <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
        <h2 className="flex items-center gap-2.5">
          <span className="font-mono text-[10.5px] text-brand">{code}</span>
          <span className="h-3 w-px bg-line" />
          <span className="font-display text-sm font-semibold tracking-[0.12em] uppercase">{title}</span>
        </h2>
        <div className="flex items-center gap-3">
          {action}
          <StatusDot status={status} />
        </div>
      </header>
      <div className={cn("min-w-0 flex-1 p-4", bodyClassName)}>{children}</div>
    </section>
  )
}

function StatusDot({ status }: { status: PanelStatus }) {
  const cls = status === "loading" ? "bg-warn text-warn animate-pulse" : status === "error" ? "bg-fail text-fail" : "bg-pass text-pass"
  return <span className={cn("glow-dot size-1.5 rounded-full", cls)} title={status} />
}

export function KV({ label, children, mono }: { label: string; children: React.ReactNode; mono?: boolean }) {
  if (children === undefined || children === null || children === "") return null
  return (
    <div className="grid grid-cols-[minmax(92px,38%)_minmax(0,1fr)] items-baseline gap-3 border-b border-dashed border-line py-1.5 last:border-b-0">
      <dt className="hud-label truncate">{label}</dt>
      <dd className={cn("min-w-0 text-sm break-words", mono && "font-mono text-[12.5px]")}>{children}</dd>
    </div>
  )
}

export function KVList({ children, className }: { children: React.ReactNode; className?: string }) {
  return <dl className={className}>{children}</dl>
}

export function SubHead({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="mt-4 mb-2 flex items-center gap-2 first:mt-0">
      <span className="hud-label">{children}</span>
      <span className="h-px flex-1 bg-line" />
      {right}
    </div>
  )
}

export function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value)
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        } catch {
          toast.error("Couldn't copy to clipboard")
        }
      }}
      className="shrink-0 p-1 text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:text-brand focus-visible:opacity-100"
    >
      {copied ? <Check className="size-3.5 text-pass" /> : <Copy className="size-3.5" />}
    </button>
  )
}

export function MonoList({ items, empty = "none" }: { items: string[]; empty?: string }) {
  if (items.length === 0) return <p className="font-mono text-xs text-muted-foreground/70">— {empty}</p>
  return (
    <ul className="space-y-1">
      {items.map((r, i) => (
        <li key={i} className="group flex items-start gap-2 font-mono text-[12.5px]">
          <span className="mt-[7px] size-1 shrink-0 bg-brand/70" />
          <span className="min-w-0 flex-1 break-all">{r}</span>
          <CopyButton value={r} />
        </li>
      ))}
    </ul>
  )
}

export const SEVERITY_STYLE: Record<Severity, { icon: typeof Info; text: string; bg: string; dot: string; border: string; label: string }> = {
  fail: { icon: XCircle, text: "text-fail", bg: "bg-fail/10", dot: "bg-fail", border: "border-fail/40", label: "Critical" },
  warn: { icon: AlertTriangle, text: "text-warn", bg: "bg-warn/10", dot: "bg-warn", border: "border-warn/40", label: "Warning" },
  info: { icon: Info, text: "text-info", bg: "bg-info/10", dot: "bg-info", border: "border-info/40", label: "Suggestion" },
  pass: { icon: CheckCircle2, text: "text-pass", bg: "bg-pass/10", dot: "bg-pass", border: "border-pass/40", label: "Passed" },
}

export function SeverityIcon({ severity, className }: { severity: Severity; className?: string }) {
  const { icon: Icon, text } = SEVERITY_STYLE[severity]
  return <Icon className={cn("size-4 shrink-0", text, className)} aria-label={SEVERITY_STYLE[severity].label} />
}

export function Tag({ tone = "neutral", children, className }: { tone?: Severity | "neutral" | "brand"; children: React.ReactNode; className?: string }) {
  const cls =
    tone === "neutral"
      ? "border-line text-muted-foreground"
      : tone === "brand"
        ? "border-brand/40 text-brand bg-brand/10"
        : `${SEVERITY_STYLE[tone].border} ${SEVERITY_STYLE[tone].text} ${SEVERITY_STYLE[tone].bg}`
  return <span className={cn("inline-flex items-center gap-1 border px-1.5 py-px font-mono text-[10.5px] tracking-wider uppercase", cls, className)}>{children}</span>
}

export function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={cn("animate-pulse bg-brand/10", className)} style={style} />
}

export function LinesSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-3.5" style={{ width: `${92 - ((i * 17) % 45)}%` }} />
      ))}
    </div>
  )
}

export function ErrorNote({ message }: { message: string }) {
  return <p className="font-mono text-xs text-fail">! check failed: {message}</p>
}

export function formatDate(iso?: string) {
  if (!iso) return undefined
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toISOString().slice(0, 10)
}

export function daysFrom(iso?: string) {
  if (!iso) return undefined
  return Math.floor((new Date(iso).getTime() - Date.now()) / 86_400_000)
}

/** "7y 4m" style age from an ISO date in the past. */
export function ageOf(iso?: string) {
  const d = daysFrom(iso)
  if (d === undefined) return undefined
  const days = -d
  const y = Math.floor(days / 365)
  const m = Math.floor((days % 365) / 30)
  return y ? `${y}y ${m}m` : m ? `${m}m` : `${days}d`
}

export function ttl(s: number) {
  if (s >= 86400 && s % 86400 === 0) return `${s / 86400}d`
  if (s >= 3600 && s % 3600 === 0) return `${s / 3600}h`
  if (s >= 60) return `${Math.round(s / 60)}m`
  return `${s}s`
}
