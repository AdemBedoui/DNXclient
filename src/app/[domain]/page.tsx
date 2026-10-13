import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import { cache } from "react"
import { JsonLd } from "@/components/json-ld"
import { Logo } from "@/components/logo"
import { Report } from "@/components/report/report"
import type { ReportState } from "@/components/report/use-report"
import { SearchForm } from "@/components/search-form"
import { ThemeToggle } from "@/components/theme-toggle"
import { isValidDomain, normalizeDomain } from "@/lib/dnx/domain"
import { withTimeout } from "@/lib/dnx/net"
import { runCheck } from "@/lib/dnx/run"
import { SITE_NAME, SITE_URL } from "@/lib/site"

export const maxDuration = 30

async function resolveDomain(params: Promise<{ domain: string }>) {
  const raw = decodeURIComponent((await params).domain)
  const domain = normalizeDomain(raw)
  return { raw, domain, valid: isValidDomain(domain) }
}

/**
 * Fast sections rendered on the server so search engines (and first paint)
 * get real WHOIS / DNS / IP content. Slower checks stream in on the client.
 * Wrapped in React cache() so metadata and page share one run.
 */
const prefetch = cache(async (domain: string): Promise<Partial<ReportState>> => {
  const settle = <T,>(p: Promise<T>) => withTimeout(p, 5000, "prefetch").catch(() => null)
  const [registration, dns, network] = await Promise.all([
    settle(runCheck("registration", domain)),
    settle(runCheck("dns", domain)),
    settle(runCheck("network", domain)),
  ])
  const out: Partial<ReportState> = {}
  if (registration) out.registration = { status: "done", ...registration }
  if (dns) out.dns = { status: "done", ...dns }
  if (network) out.network = { status: "done", ...network }
  return out
})

function describe(domain: string, d: Partial<ReportState>): string {
  const reg = d.registration?.status === "done" ? d.registration.data : undefined
  const dns = d.dns?.status === "done" ? d.dns.data : undefined
  const net = d.network?.status === "done" ? d.network.data : undefined
  if (reg?.status === "available") {
    return `${domain} is available — no registration found in the registry. Check other extensions and domain details with DNX.`
  }
  const parts = [`WHOIS and DNS lookup for ${domain}.`]
  if (reg?.registrar) parts.push(`Registrar: ${reg.registrar}${reg.createdAt ? `, registered ${reg.createdAt.slice(0, 10)}` : ""}.`)
  if (dns?.A[0]) parts.push(`IP ${dns.A[0]}${net?.ips[0]?.asName ? ` (${net.ips[0].asName.split(",")[0]})` : ""}.`)
  if (dns?.NS.length) parts.push(`Name servers: ${dns.NS.slice(0, 2).join(", ")}.`)
  parts.push("See all DNS records, SSL certificate, SPF/DKIM/DMARC and security headers.")
  return parts.join(" ")
}

export async function generateMetadata({ params }: PageProps<"/[domain]">): Promise<Metadata> {
  const { domain, valid } = await resolveDomain(params)
  if (!valid) return { robots: { index: false } }
  const description = describe(domain, await prefetch(domain))
  const title = `${domain} WHOIS, DNS Records & SSL Check`
  return {
    title,
    description,
    alternates: { canonical: `/${domain}` },
    openGraph: { title: `${title} | ${SITE_NAME}`, description, url: `/${domain}`, type: "article" },
    twitter: { card: "summary_large_image", title: `${title} | ${SITE_NAME}`, description },
  }
}

export default async function DomainPage({ params }: PageProps<"/[domain]">) {
  const { raw, domain, valid } = await resolveDomain(params)
  if (!valid) notFound()
  if (raw !== domain) redirect(`/${domain}`)

  const initial = await prefetch(domain)

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: SITE_NAME, item: SITE_URL },
            { "@type": "ListItem", position: 2, name: `${domain} report`, item: `${SITE_URL}/${domain}` },
          ],
        }}
      />
      <header className="sticky top-0 z-40 border-b border-line bg-background/75 backdrop-blur-md">
        <div className="flex items-center gap-3 px-4 py-2.5 sm:gap-6 lg:px-6">
          <Logo compact />
          <SearchForm size="sm" className="min-w-0 max-w-xl flex-1" />
          <div className="ml-auto shrink-0">
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className="w-full flex-1 px-3 py-4 sm:px-4 lg:px-6 lg:py-6">
        <Report key={domain} domain={domain} initial={initial} />
      </main>
    </>
  )
}
