"use client"

import { ChevronRight } from "lucide-react"
import { CATEGORY_LABEL, sortFindings } from "@/lib/dnx/score"
import type { Finding } from "@/lib/dnx/types"
import { cn } from "@/lib/utils"
import { SEVERITY_STYLE, SeverityIcon } from "./primitives"

export function FindingRow({ finding: f, showCategory }: { finding: Finding; showCategory?: boolean }) {
  const expandable = f.severity !== "pass" && (f.detail || f.fix)
  const head = (
    <>
      <SeverityIcon severity={f.severity} className="mt-0.5" />
      <span className="min-w-0 flex-1 text-sm">{f.title}</span>
      {showCategory && <span className="hud-label hidden shrink-0 sm:inline">{CATEGORY_LABEL[f.category]}</span>}
    </>
  )
  const bar = <span className={cn("absolute inset-y-0 left-0 w-0.5", SEVERITY_STYLE[f.severity].dot)} />

  if (!expandable) {
    return (
      <li className="relative flex items-start gap-3 px-4 py-2.5">
        {bar}
        {head}
      </li>
    )
  }

  return (
    <li className="relative">
      {bar}
      <details className="group/f">
        <summary className="flex cursor-pointer list-none items-start gap-3 px-4 py-2.5 transition hover:bg-brand/5 [&::-webkit-details-marker]:hidden">
          {head}
          <ChevronRight className="mt-0.5 size-4 shrink-0 text-muted-foreground transition group-open/f:rotate-90" />
        </summary>
        <div className="space-y-2 px-4 pb-4 pl-11 text-sm">
          {f.detail && <p className="text-muted-foreground">{f.detail}</p>}
          {f.fix && (
            <div className="border-l-2 border-brand bg-brand/5 px-3 py-2">
              <p className="hud-label mb-1 text-brand!">Fix</p>
              <p className="font-mono text-[12.5px] break-words">{f.fix}</p>
            </div>
          )}
        </div>
      </details>
    </li>
  )
}

/** `bare` drops the panel frame, for lists that already sit inside a Panel. */
export function FindingList({ findings, showCategory, className, bare }: { findings: Finding[]; showCategory?: boolean; className?: string; bare?: boolean }) {
  if (findings.length === 0) return null
  return (
    <ul className={cn("divide-y divide-line", !bare && "hud", className)}>
      {sortFindings(findings).map((f) => (
        <FindingRow key={f.id} finding={f} showCategory={showCategory} />
      ))}
    </ul>
  )
}
