import Link from "next/link"
import { POPULAR_DOMAINS } from "@/lib/site"

export function SiteFooter() {
  return (
    <footer className="relative z-10 mt-auto border-t border-line">
      <nav aria-label="Popular reports" className="flex flex-wrap gap-x-4 gap-y-1 px-4 pt-4 font-mono text-[11px] text-muted-foreground lg:px-8">
        <span className="hud-label">Popular</span>
        {POPULAR_DOMAINS.slice(0, 10).map((d) => (
          <Link key={d} href={`/${d}`} className="hover:text-brand">
            {d}
          </Link>
        ))}
      </nav>
      <div className="flex flex-col gap-2 px-4 py-4 font-mono text-[11px] tracking-wider text-muted-foreground uppercase sm:flex-row sm:items-center sm:justify-between lg:px-8">
        <p>DNX // domain intelligence · DNS · Email · TLS · Web · WHOIS</p>
        <p>WHOIS · DNS lookup · SSL checker · SPF / DKIM / DMARC checker</p>
      </div>
    </footer>
  )
}
