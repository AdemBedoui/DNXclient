"use client"

import { X } from "lucide-react"
import Link from "next/link"
import { clearRecent, useRecent } from "@/lib/recent"

export function RecentSearches() {
  const recent = useRecent()
  if (recent.length === 0) return null
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="hud-label mr-1">Recent</span>
      {recent.map((d) => (
        <Link key={d} href={`/${d}`} className="border border-line bg-panel px-2.5 py-1 font-mono text-xs transition hover:border-brand/60 hover:text-brand">
          {d}
        </Link>
      ))}
      <button onClick={clearRecent} className="p-1 text-muted-foreground hover:text-foreground" aria-label="Clear recent searches">
        <X className="size-3.5" />
      </button>
    </div>
  )
}
