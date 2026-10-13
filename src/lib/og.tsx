// Shared 1200x630 social card used by the home and report Open Graph images.

export const OG_SIZE = { width: 1200, height: 630 }

export function OgCard({ eyebrow, title, subtitle, chips = [] }: { eyebrow: string; title: string; subtitle: string; chips?: string[] }) {
  const cyan = "#5ee6f0"
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 72,
        background: "#0b0e18",
        backgroundImage:
          "radial-gradient(ellipse 60% 60% at 0% 0%, rgba(94,230,240,.22), transparent 60%), radial-gradient(ellipse 50% 50% at 100% 100%, rgba(190,90,255,.18), transparent 60%), linear-gradient(rgba(94,230,240,.06) 1px, transparent 1px), linear-gradient(90deg, rgba(94,230,240,.06) 1px, transparent 1px)",
        backgroundSize: "100% 100%, 100% 100%, 48px 48px, 48px 48px",
        color: "#e8f1f7",
        fontFamily: "monospace",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <svg width="56" height="56" viewBox="0 0 32 32">
          <path d="M16 3.5 27 9.8v12.4L16 28.5 5 22.2V9.8Z" fill="none" stroke={cyan} strokeWidth="1.4" opacity=".55" />
          <path d="M16 8.5 22.6 12.3v7.4L16 23.5 9.4 19.7v-7.4Z" fill="rgba(94,230,240,.15)" stroke={cyan} strokeWidth="1.4" />
          <circle cx="16" cy="16" r="2.6" fill={cyan} />
        </svg>
        <div style={{ fontSize: 34, letterSpacing: 10, fontWeight: 700 }}>DNX</div>
        <div style={{ marginLeft: "auto", fontSize: 20, letterSpacing: 4, color: "#8aa0b4", textTransform: "uppercase" }}>{eyebrow}</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: title.length > 22 ? 64 : 92, fontWeight: 700, color: cyan, lineHeight: 1.05, wordBreak: "break-all" }}>{title}</div>
        <div style={{ marginTop: 20, fontSize: 30, color: "#b9c7d4" }}>{subtitle}</div>
      </div>

      <div style={{ display: "flex", gap: 14 }}>
        {chips.map((c) => (
          <div key={c} style={{ display: "flex", border: "1px solid rgba(94,230,240,.4)", color: cyan, padding: "8px 16px", fontSize: 22, letterSpacing: 2 }}>
            {c}
          </div>
        ))}
      </div>
    </div>
  )
}
