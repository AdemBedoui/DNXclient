import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import { Logo } from "@/components/logo"
import { Report } from "@/components/report/report"
import { SearchForm } from "@/components/search-form"
import { ThemeToggle } from "@/components/theme-toggle"
import { isValidDomain, normalizeDomain } from "@/lib/dnx/domain"

async function resolveDomain(params: Promise<{ domain: string }>) {
  const raw = decodeURIComponent((await params).domain)
  const domain = normalizeDomain(raw)
  return { raw, domain, valid: isValidDomain(domain) }
}

export async function generateMetadata({ params }: PageProps<"/[domain]">): Promise<Metadata> {
  const { domain, valid } = await resolveDomain(params)
  if (!valid) return {}
  return {
    title: `${domain} — domain intelligence`,
    description: `WHOIS, DNS records, network, TLS, email authentication and web security for ${domain}.`,
    alternates: { canonical: `/${domain}` },
  }
}

export default async function DomainPage({ params }: PageProps<"/[domain]">) {
  const { raw, domain, valid } = await resolveDomain(params)
  if (!valid) notFound()
  if (raw !== domain) redirect(`/${domain}`)

  return (
    <>
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
        <Report key={domain} domain={domain} />
      </main>
    </>
  )
}
