"use client"

import { History, X } from "lucide-react"
import Link from "next/link"
import { clearRecent, useRecent } from "@/lib/recent"

export function RecentSearches() {
  const recent = useRecent()
  if (recent.length === 0) return null
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
      <span className="flex items-center gap-1.5 text-muted-foreground">
        <History className="size-3.5" /> Recent
      </span>
      {recent.map((d) => (
        <Link key={d} href={`/${d}`} className="rounded-md border bg-card px-2.5 py-1 font-mono text-xs transition hover:border-brand/50 hover:text-brand">
          {d}
        </Link>
      ))}
      <button onClick={clearRecent} className="rounded-md p-1 text-muted-foreground hover:text-foreground" aria-label="Clear recent searches">
        <X className="size-3.5" />
      </button>
    </div>
  )
}
