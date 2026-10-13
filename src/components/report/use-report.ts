"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { addRecent } from "@/lib/recent"
import { computeScore } from "@/lib/dnx/score"
import { SECTIONS, type Finding, type SectionDataMap, type SectionName } from "@/lib/dnx/types"

export type SectionState<K extends SectionName> =
  | { status: "loading" }
  | { status: "error"; error: string }
  | { status: "done"; data: SectionDataMap[K]; findings: Finding[]; durationMs: number }

export type ReportState = { [K in SectionName]: SectionState<K> }

const loadingState = () => Object.fromEntries(SECTIONS.map((s) => [s, { status: "loading" }])) as ReportState

/** `initial` holds sections already rendered on the server; they are not fetched again on first load. */
export function useReport(domain: string, initial?: Partial<ReportState>) {
  const [state, setState] = useState<ReportState>(() => ({ ...loadingState(), ...initial }))
  const [run, setRun] = useState(0)

  useEffect(() => {
    const ctrl = new AbortController()
    const skip = run === 0 ? new Set(Object.keys(initial ?? {})) : new Set<string>()
    for (const section of SECTIONS) {
      if (skip.has(section)) continue
      fetch(`/api/check/${section}?domain=${encodeURIComponent(domain)}${run ? `&r=${run}` : ""}`, { signal: ctrl.signal })
        .then(async (res) => {
          const body = await res.json()
          if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`)
          setState((s) => ({ ...s, [section]: { status: "done", ...body } }))
        })
        .catch((e: Error) => {
          if (e.name === "AbortError") return
          setState((s) => ({ ...s, [section]: { status: "error", error: e.message } }))
        })
    }
    addRecent(domain)
    return () => ctrl.abort()
    // `initial` only matters for the first run; ignoring later identity changes is intended.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domain, run])

  const rerun = useCallback(() => {
    setState(loadingState())
    setRun((r) => r + 1)
  }, [])

  const findings = useMemo(
    () => SECTIONS.flatMap((s) => (state[s].status === "done" ? state[s].findings : [])),
    [state],
  )
  const done = SECTIONS.every((s) => state[s].status !== "loading")
  const progress = SECTIONS.filter((s) => state[s].status !== "loading").length / SECTIONS.length
  const score = useMemo(() => computeScore(findings), [findings])

  return { state, findings, score, done, progress, rerun }
}
