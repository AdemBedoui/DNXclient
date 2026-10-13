"use client"

import { ChevronRight } from "lucide-react"
import { CATEGORY_LABEL, sortFindings } from "@/lib/dnx/score"
import type { Finding } from "@/lib/dnx/types"
import { cn } from "@/lib/utils"
import { SeverityIcon } from "./primitives"

export function FindingRow({ finding: f, showCategory }: { finding: Finding; showCategory?: boolean }) {
  const expandable = f.severity !== "pass" && (f.detail || f.fix)
  const head = (
    <>
      <SeverityIcon severity={f.severity} className="mt-0.5" />
      <span className="min-w-0 flex-1 text-sm">{f.title}</span>
      {showCategory && (
        <span className="hidden shrink-0 rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground sm:inline">
          {CATEGORY_LABEL[f.category]}
        </span>
      )}
    </>
  )

  if (!expandable) {
    return <li className="flex items-start gap-3 px-4 py-3">{head}</li>
  }

  return (
    <li>
      <details className="group/f">
        <summary className="flex cursor-pointer list-none items-start gap-3 px-4 py-3 transition hover:bg-accent/40 [&::-webkit-details-marker]:hidden">
          {head}
          <ChevronRight className="mt-0.5 size-4 shrink-0 text-muted-foreground transition group-open/f:rotate-90" />
        </summary>
        <div className="space-y-2 px-4 pb-4 pl-11 text-sm">
          {f.detail && <p className="text-muted-foreground">{f.detail}</p>}
          {f.fix && (
            <div className="rounded-lg border border-brand/20 bg-brand/5 p-3">
              <p className="mb-1 text-xs font-semibold tracking-wide text-brand uppercase">How to fix</p>
              <p className="break-words">{f.fix}</p>
            </div>
          )}
        </div>
      </details>
    </li>
  )
}

export function FindingList({ findings, showCategory, className }: { findings: Finding[]; showCategory?: boolean; className?: string }) {
  if (findings.length === 0) return null
  return (
    <ul className={cn("divide-y overflow-hidden rounded-xl border bg-card", className)}>
      {sortFindings(findings).map((f) => (
        <FindingRow key={f.id} finding={f} showCategory={showCategory} />
      ))}
    </ul>
  )
}
