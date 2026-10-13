import type { Category, Finding, Severity } from "./types"

// Pure scoring — runs in the browser over findings from all sections.

const PENALTY: Record<Severity, number> = { pass: 0, info: 1, warn: 6, fail: 14 }

export const SEVERITY_ORDER: Severity[] = ["fail", "warn", "info", "pass"]

export const CATEGORY_LABEL: Record<Category, string> = {
  registration: "Registration",
  dns: "DNS",
  email: "Email",
  security: "Security",
  web: "Website",
}

export interface Score {
  value: number
  grade: "A" | "B" | "C" | "D" | "F"
  counts: Record<Severity, number>
}

export function computeScore(findings: Finding[]): Score {
  const counts: Record<Severity, number> = { pass: 0, info: 0, warn: 0, fail: 0 }
  let penalty = 0
  for (const f of findings) {
    counts[f.severity]++
    penalty += PENALTY[f.severity]
  }
  const value = Math.max(0, Math.min(100, 100 - penalty))
  const grade = value >= 90 ? "A" : value >= 80 ? "B" : value >= 65 ? "C" : value >= 50 ? "D" : "F"
  return { value, grade, counts }
}

export function sortFindings(findings: Finding[]): Finding[] {
  return [...findings].sort((a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity))
}
