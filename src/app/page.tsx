import { Globe, Lock, Mail, Network, ScrollText, ShieldCheck } from "lucide-react"
import Link from "next/link"
import { Logo } from "@/components/logo"
import { Radar } from "@/components/radar"
import { RecentSearches } from "@/components/recent-searches"
import { SearchForm } from "@/components/search-form"
import { ThemeToggle } from "@/components/theme-toggle"
import { Faq, FAQ } from "@/components/faq"
import { JsonLd } from "@/components/json-ld"
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site"

const EXAMPLES = ["google.tn", "oxahost.tn", "github.com", "bbc.co.uk"]

const CHECKS = [
  { icon: ScrollText, code: "01", title: "WHOIS / RDAP", text: "Registrar, lifecycle dates, locks and contacts — .tn included." },
  { icon: Network, code: "02", title: "DNS zone", text: "Every record with TTLs, DNSSEC and 4-resolver propagation." },
  { icon: Globe, code: "03", title: "Network", text: "IP, ASN, prefix, country, reverse DNS, hosting and CDN." },
  { icon: Lock, code: "04", title: "TLS", text: "Certificate, chain, covered names, protocol and expiry." },
  { icon: Mail, code: "05", title: "Email auth", text: "MX, SPF lookups, DMARC policy, DKIM on 26 selectors." },
  { icon: ShieldCheck, code: "06", title: "Web security", text: "Redirects, HTTPS, security headers and tech stack." },
]

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <JsonLd data={STRUCTURED_DATA} />
      <header className="flex items-center justify-between px-4 py-4 lg:px-8">
        <Logo />
        <div className="flex items-center gap-4">
          <span className="hidden items-center gap-2 font-mono text-[11px] tracking-widest text-muted-foreground uppercase sm:flex">
            <span className="glow-dot size-1.5 rounded-full bg-pass text-pass" /> Systems online
          </span>
          <ThemeToggle />
        </div>
      </header>

      <section className="grid flex-1 items-center gap-10 px-4 py-10 lg:grid-cols-[1.15fr_1fr] lg:px-8 xl:gap-16 xl:px-16">
        <div className="max-w-3xl">
          <p className="hud-label mb-6 flex items-center gap-3">
            <span className="h-px w-10 bg-brand" /> Free WHOIS · DNS lookup · SSL &amp; email checker
          </p>
          <h1 className="font-display text-5xl leading-[0.95] font-bold tracking-tight uppercase sm:text-7xl 2xl:text-8xl">
            See everything
            <br />
            behind a <span className="text-glow text-brand">domain</span>
          </h1>
          <p className="mt-6 max-w-xl text-base text-muted-foreground sm:text-lg">
            One scan pulls WHOIS, every DNS record, network, TLS, email authentication and web security — then tells you what to fix.
          </p>

          <SearchForm autoFocus className="mt-10 max-w-2xl" />

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="hud-label mr-1">Try</span>
            {EXAMPLES.map((d) => (
              <Link key={d} href={`/${d}`} className="px-2 py-1 font-mono text-xs text-muted-foreground transition hover:text-brand">
                {d}
              </Link>
            ))}
          </div>
          <div className="mt-4">
            <RecentSearches />
          </div>
        </div>

        <div className="hidden lg:block">
          <Radar />
        </div>
      </section>

      <section className="grid border-t border-line sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        {CHECKS.map(({ icon: Icon, code, title, text }) => (
          <div key={title} className="group border-b border-line p-6 transition hover:bg-panel sm:border-r lg:p-8">
            <div className="mb-5 flex items-center justify-between">
              <Icon className="size-5 text-brand" />
              <span className="font-mono text-[11px] text-muted-foreground">{code}</span>
            </div>
            <h3 className="font-display text-lg font-semibold tracking-wide uppercase">{title}</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">{text}</p>
          </div>
        ))}
      </section>

      <Faq />
    </main>
  )
}

const STRUCTURED_DATA = [
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/{domain}` },
      "query-input": "required name=domain",
    },
  },
  {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Any",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map(({ q, a }) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
  },
]
