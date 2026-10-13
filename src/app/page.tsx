import { Globe, Lock, Mail, Network, ScrollText, ShieldCheck } from "lucide-react"
import Link from "next/link"
import { Logo } from "@/components/logo"
import { RecentSearches } from "@/components/recent-searches"
import { SearchForm } from "@/components/search-form"
import { ThemeToggle } from "@/components/theme-toggle"

const EXAMPLES = ["google.tn", "oxahost.tn", "github.com", "bbc.co.uk"]

const CHECKS = [
  { icon: ScrollText, title: "Registration", text: "Registrar, creation and expiry dates, status locks and owner — via RDAP and WHOIS, including .tn." },
  { icon: Network, title: "DNS", text: "A, AAAA, NS, MX, TXT, CAA and SOA records, DNSSEC, and propagation across four public resolvers." },
  { icon: Mail, title: "Email security", text: "SPF with lookup counting, DMARC policy, DKIM on 26 common selectors, MTA-STS and provider detection." },
  { icon: Lock, title: "SSL / TLS", text: "Certificate validity, trust chain, TLS version, covered names and days until expiry." },
  { icon: ShieldCheck, title: "Security headers", text: "HSTS, CSP, clickjacking and MIME-sniffing protection, with copy-paste fixes." },
  { icon: Globe, title: "Website & hosting", text: "Redirect chain, HTTPS enforcement, response time, CDN/host, ASN and detected technologies." },
]

export default function Home() {
  return (
    <main className="relative flex-1">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[640px] bg-grid [mask-image:linear-gradient(to_bottom,black,transparent)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] glow-brand" />

      <header className="relative mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Logo />
        <ThemeToggle />
      </header>

      <section className="relative mx-auto max-w-3xl px-4 pt-16 pb-20 text-center sm:px-6 sm:pt-24">
        <p className="mb-5 inline-flex items-center gap-2 rounded-full border bg-card/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
          <span className="size-1.5 rounded-full bg-pass" /> DNS · Email · SSL · Web · WHOIS
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
          How healthy is your <span className="text-brand">domain</span>?
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-base text-pretty text-muted-foreground sm:text-lg">
          One search runs 40+ checks and gives you a score, the problems that matter, and exactly how to fix them.
        </p>

        <SearchForm autoFocus className="mx-auto mt-10 max-w-2xl text-left" />

        <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-sm">
          <span className="text-muted-foreground">Try</span>
          {EXAMPLES.map((d) => (
            <Link key={d} href={`/${d}`} className="rounded-md px-2 py-1 font-mono text-xs text-muted-foreground underline-offset-4 transition hover:text-brand hover:underline">
              {d}
            </Link>
          ))}
        </div>
        <div className="mt-6">
          <RecentSearches />
        </div>
      </section>

      <section className="relative mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        <h2 className="mb-6 text-sm font-medium tracking-wide text-muted-foreground uppercase">What DNX checks</h2>
        <div className="grid gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {CHECKS.map(({ icon: Icon, title, text }) => (
            <div key={title} className="bg-card p-6">
              <Icon className="mb-4 size-5 text-brand" />
              <h3 className="font-medium">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
