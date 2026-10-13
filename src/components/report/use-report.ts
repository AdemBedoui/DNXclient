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

const initial = () => Object.fromEntries(SECTIONS.map((s) => [s, { status: "loading" }])) as ReportState

export function useReport(domain: string) {
  const [state, setState] = useState<ReportState>(initial)
  const [run, setRun] = useState(0)

  useEffect(() => {
    const ctrl = new AbortController()
    for (const section of SECTIONS) {
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
  }, [domain, run])

  const rerun = useCallback(() => {
    setState(initial())
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
