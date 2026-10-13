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
    title: `${domain} — domain health report`,
    description: `DNS, email security, SSL, security headers and WHOIS for ${domain}.`,
    alternates: { canonical: `/${domain}` },
  }
}

export default async function DomainPage({ params }: PageProps<"/[domain]">) {
  const { raw, domain, valid } = await resolveDomain(params)
  if (!valid) notFound()
  if (raw !== domain) redirect(`/${domain}`)

  return (
    <>
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:gap-6 sm:px-6">
          <Logo compact />
          <SearchForm size="sm" className="min-w-0 max-w-md flex-1" />
          <div className="ml-auto shrink-0">
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <Report key={domain} domain={domain} />
      </main>
    </>
  )
}
