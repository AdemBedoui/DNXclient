// Decorative radar for the home page. Pure SVG + CSS animation.

const BLIPS = [
  { x: 128, y: 92, label: "A 102.204.204.16" },
  { x: 268, y: 128, label: "MX mailgw" },
  { x: 92, y: 236, label: "NS cloudflare" },
  { x: 250, y: 268, label: "TXT v=spf1" },
  { x: 196, y: 58, label: "TLS 1.3" },
  { x: 310, y: 206, label: "DMARC p=reject" },
]

export function Radar() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[520px]" aria-hidden>
      <svg viewBox="0 0 400 400" className="absolute inset-0 size-full text-brand">
        <defs>
          <radialGradient id="rg" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="currentColor" stopOpacity=".12" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="sweep" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0" />
            <stop offset="100%" stopColor="currentColor" stopOpacity=".35" />
          </linearGradient>
        </defs>
        <circle cx="200" cy="200" r="190" fill="url(#rg)" />
        {[190, 145, 100, 55].map((r) => (
          <circle key={r} cx="200" cy="200" r={r} fill="none" stroke="currentColor" strokeOpacity=".22" strokeDasharray={r === 190 ? "2 6" : undefined} />
        ))}
        <line x1="10" y1="200" x2="390" y2="200" stroke="currentColor" strokeOpacity=".15" />
        <line x1="200" y1="10" x2="200" y2="390" stroke="currentColor" strokeOpacity=".15" />
        {Array.from({ length: 36 }, (_, i) => {
          const a = (i * 10 * Math.PI) / 180
          const r1 = i % 3 === 0 ? 178 : 184
          return (
            <line
              key={i}
              x1={(200 + Math.cos(a) * r1).toFixed(2)}
              y1={(200 + Math.sin(a) * r1).toFixed(2)}
              x2={(200 + Math.cos(a) * 190).toFixed(2)}
              y2={(200 + Math.sin(a) * 190).toFixed(2)}
              stroke="currentColor"
              strokeOpacity=".4"
            />
          )
        })}
        <g style={{ transformOrigin: "200px 200px", animation: "radar 4s linear infinite" }}>
          <path d="M200 200 L390 200 A190 190 0 0 0 334 66 Z" fill="url(#sweep)" />
          <line x1="200" y1="200" x2="390" y2="200" stroke="currentColor" strokeWidth="1.5" />
        </g>
        <circle cx="200" cy="200" r="4" fill="currentColor" />
      </svg>
      {BLIPS.map((b, i) => (
        <div
          key={b.label}
          className="absolute flex -translate-x-1 -translate-y-1 items-center gap-2"
          style={{ left: `${(b.x / 400) * 100}%`, top: `${(b.y / 400) * 100}%`, animation: `blink 4s ${i * 0.65}s steps(1) infinite` }}
        >
          <span className="glow-dot size-2 rounded-full bg-brand text-brand" />
          <span className="border border-line bg-panel px-1.5 py-0.5 font-mono text-[10px] whitespace-nowrap text-brand backdrop-blur">{b.label}</span>
        </div>
      ))}
    </div>
  )
}
