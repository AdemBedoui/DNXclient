import type { Score } from "@/lib/dnx/score"
import { cn } from "@/lib/utils"

const GRADE_COLOR: Record<Score["grade"], string> = {
  A: "text-pass",
  B: "text-pass",
  C: "text-warn",
  D: "text-warn",
  F: "text-fail",
}

/** Segmented HUD gauge: 40 ticks around a circle, lit up to the score. */
export function ScoreRing({ score, loading, size = "md" }: { score: Score; loading: boolean; size?: "md" | "lg" }) {
  const color = loading ? "text-brand" : GRADE_COLOR[score.grade]
  const lit = loading ? 0 : Math.round((score.value / 100) * 40)
  return (
    <div
      className={cn("relative shrink-0", size === "lg" ? "size-36" : "size-28")}
      role="img"
      aria-label={loading ? "Calculating score" : `Health score ${score.value} out of 100, grade ${score.grade}`}
    >
      <svg viewBox="0 0 100 100" className={cn("size-full", color, loading && "animate-[radar_3s_linear_infinite]")}>
        {Array.from({ length: 40 }, (_, i) => {
          const a = ((i * 9 - 90) * Math.PI) / 180
          const on = loading ? i < 10 : i < lit
          return (
            <line
              key={i}
              x1={(50 + Math.cos(a) * 38).toFixed(2)}
              y1={(50 + Math.sin(a) * 38).toFixed(2)}
              x2={(50 + Math.cos(a) * 47).toFixed(2)}
              y2={(50 + Math.sin(a) * 47).toFixed(2)}
              stroke="currentColor"
              strokeWidth="2.4"
              strokeOpacity={on ? 1 : 0.14}
              style={on && !loading ? { filter: "drop-shadow(0 0 2px currentColor)" } : undefined}
            />
          )
        })}
        <circle cx="50" cy="50" r="32" fill="none" stroke="currentColor" strokeOpacity=".2" strokeDasharray="1 3" />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        {loading ? (
          <span className="hud-label">scan</span>
        ) : (
          <div>
            <div className={cn("text-glow font-display leading-none font-bold", color, size === "lg" ? "text-5xl" : "text-4xl")}>{score.grade}</div>
            <div className="mt-1 font-mono text-[11px] text-muted-foreground tabular-nums">{score.value}/100</div>
          </div>
        )}
      </div>
    </div>
  )
}
