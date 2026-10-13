import { ImageResponse } from "next/og"
import { isValidDomain, normalizeDomain } from "@/lib/dnx/domain"
import { OG_SIZE, OgCard } from "@/lib/og"

export const alt = "DNX domain report"
export const size = OG_SIZE
export const contentType = "image/png"

export default async function Image({ params }: { params: Promise<{ domain: string }> }) {
  const domain = normalizeDomain(decodeURIComponent((await params).domain))
  const title = isValidDomain(domain) ? domain : "Domain report"
  return new ImageResponse(
    <OgCard eyebrow="Domain report" title={title} subtitle="WHOIS, DNS records, SSL, email security & health score" chips={["WHOIS", "DNS", "TLS", "SPF", "DMARC"]} />,
    size,
  )
}
