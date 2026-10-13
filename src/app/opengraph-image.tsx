import { ImageResponse } from "next/og"
import { OG_SIZE, OgCard } from "@/lib/og"

export const alt = "DNX — WHOIS, DNS lookup, SSL and email security checker"
export const size = OG_SIZE
export const contentType = "image/png"

export default function Image() {
  return new ImageResponse(
    <OgCard eyebrow="Domain intelligence" title="See everything behind a domain" subtitle="WHOIS · DNS records · SSL · SPF / DKIM / DMARC · Security headers" chips={["WHOIS", "DNS", "TLS", "EMAIL", "WEB"]} />,
    size,
  )
}
