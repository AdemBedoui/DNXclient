"use client"

import { AlertTriangle, Check, CheckCircle2, Copy, Info, XCircle } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import type { Severity } from "@/lib/dnx/types"
import { cn } from "@/lib/utils"

export function Panel({
  title,
  icon: Icon,
  action,
  children,
  className,
}: {
  title: string
  icon?: React.ComponentType<{ className?: string }>
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={cn("rounded-xl border bg-card", className)}>
      <header className="flex items-center justify-between gap-3 border-b px-4 py-3 sm:px-5">
        <h3 className="flex items-center gap-2 text-sm font-medium">
          {Icon && <Icon className="size-4 text-muted-foreground" />}
          {title}
        </h3>
        {action}
      </header>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  )
}

export function KV({ label, children, mono }: { label: string; children: React.ReactNode; mono?: boolean }) {
  if (children === undefined || children === null || children === "") return null
  return (
    <div className="flex flex-col gap-0.5 py-2 sm:flex-row sm:items-baseline sm:gap-4">
      <dt className="shrink-0 text-xs text-muted-foreground sm:w-36">{label}</dt>
      <dd className={cn("min-w-0 text-sm break-words", mono && "font-mono text-[13px]")}>{children}</dd>
    </div>
  )
}

export function KVList({ children }: { children: React.ReactNode }) {
  return <dl className="divide-y divide-border/60">{children}</dl>
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
      className="shrink-0 rounded-md p-1.5 text-muted-foreground opacity-60 transition hover:bg-accent hover:text-foreground hover:opacity-100 focus-visible:opacity-100 group-hover:opacity-100"
    >
      {copied ? <Check className="size-3.5 text-pass" /> : <Copy className="size-3.5" />}
    </button>
  )
}

export function RecordList({ label, records, empty = "None" }: { label: string; records: string[]; empty?: string }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-2">
        <span className="font-mono text-xs font-semibold text-muted-foreground">{label}</span>
        {records.length > 0 && <span className="text-xs text-muted-foreground/70">{records.length}</span>}
      </div>
      {records.length === 0 ? (
        <p className="text-sm text-muted-foreground/70 italic">{empty}</p>
      ) : (
        <ul className="overflow-hidden rounded-lg border">
          {records.map((r, i) => (
            <li key={i} className="group flex items-start gap-2 border-b px-3 py-2 last:border-b-0 even:bg-muted/30">
              <code className="min-w-0 flex-1 font-mono text-[13px] break-all">{r}</code>
              <CopyButton value={r} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export const SEVERITY_STYLE: Record<Severity, { icon: typeof Info; text: string; bg: string; dot: string; label: string }> = {
  fail: { icon: XCircle, text: "text-fail", bg: "bg-fail/10", dot: "bg-fail", label: "Critical" },
  warn: { icon: AlertTriangle, text: "text-warn", bg: "bg-warn/10", dot: "bg-warn", label: "Warning" },
  info: { icon: Info, text: "text-info", bg: "bg-info/10", dot: "bg-info", label: "Suggestion" },
  pass: { icon: CheckCircle2, text: "text-pass", bg: "bg-pass/10", dot: "bg-pass", label: "Passed" },
}

export function SeverityIcon({ severity, className }: { severity: Severity; className?: string }) {
  const { icon: Icon, text } = SEVERITY_STYLE[severity]
  return <Icon className={cn("size-4 shrink-0", text, className)} aria-label={SEVERITY_STYLE[severity].label} />
}

export function Pill({ tone, children }: { tone: Severity | "neutral"; children: React.ReactNode }) {
  const cls = tone === "neutral" ? "bg-muted text-muted-foreground" : `${SEVERITY_STYLE[tone].bg} ${SEVERITY_STYLE[tone].text}`
  return <span className={cn("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium", cls)}>{children}</span>
}

export function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} style={style} />
}

export function PanelSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <Skeleton className="mb-5 h-4 w-32" />
      <div className="space-y-3">
        {Array.from({ length: rows }, (_, i) => (
          <Skeleton key={i} className="h-4" style={{ width: `${90 - i * 12}%` }} />
        ))}
      </div>
    </div>
  )
}

export function ErrorNote({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-fail/30 bg-fail/5 p-4 text-sm text-fail">
      <XCircle className="size-4" /> This check failed: {message}
    </div>
  )
}

export function formatDate(iso?: string) {
  if (!iso) return undefined
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
}

export function daysFrom(iso?: string) {
  if (!iso) return undefined
  return Math.floor((new Date(iso).getTime() - Date.now()) / 86_400_000)
}
