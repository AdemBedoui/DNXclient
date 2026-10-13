import type { Score } from "@/lib/dnx/score"
import { cn } from "@/lib/utils"

const GRADE_COLOR: Record<Score["grade"], string> = {
  A: "text-pass",
  B: "text-pass",
  C: "text-warn",
  D: "text-warn",
  F: "text-fail",
}

export function ScoreRing({ score, loading }: { score: Score; loading: boolean }) {
  const r = 42
  const c = 2 * Math.PI * r
  const color = loading ? "text-muted-foreground" : GRADE_COLOR[score.grade]
  return (
    <div className="relative size-28 shrink-0" role="img" aria-label={loading ? "Calculating score" : `Health score ${score.value} out of 100, grade ${score.grade}`}>
      <svg viewBox="0 0 100 100" className="size-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" strokeWidth="8" className="stroke-muted" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          stroke="currentColor"
          strokeDasharray={c}
          strokeDashoffset={loading ? c * 0.75 : c * (1 - score.value / 100)}
          className={cn(color, "transition-[stroke-dashoffset] duration-700", loading && "origin-center animate-spin [animation-duration:1.4s]")}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        {loading ? (
          <span className="text-xs text-muted-foreground">Scanning…</span>
        ) : (
          <div>
            <div className={cn("text-3xl leading-none font-semibold tabular-nums", color)}>{score.grade}</div>
            <div className="mt-1 text-xs text-muted-foreground tabular-nums">{score.value}/100</div>
          </div>
        )}
      </div>
    </div>
  )
}
