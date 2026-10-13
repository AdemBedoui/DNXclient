// Site-wide constants used for metadata, sitemap and structured data.

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://dnx.tn").replace(/\/$/, "")
export const SITE_NAME = "DNX"
export const SITE_TITLE = "DNX — WHOIS, DNS Lookup, SSL & Email Security Checker"
export const SITE_DESCRIPTION =
  "Free domain checker: WHOIS lookup (including .tn), all DNS records, IP & hosting, SSL certificate, SPF / DKIM / DMARC and website security headers — with a health score and plain-language fixes."

export const KEYWORDS = [
  "whois",
  "whois tn",
  "domain lookup",
  "dns lookup",
  "dns checker",
  "dns propagation",
  "ssl checker",
  "spf checker",
  "dmarc checker",
  "dkim checker",
  "mx lookup",
  "domain health check",
  "security headers",
  "nom de domaine tunisie",
  ".tn domain",
]

/** Pre-listed report pages: sitemap entries and internal links for crawlers. */
export const POPULAR_DOMAINS = [
  "google.tn",
  "oxahost.tn",
  "topnet.tn",
  "tunisietelecom.tn",
  "ooredoo.tn",
  "orange.tn",
  "jumia.com.tn",
  "tayara.tn",
  "mosaiquefm.net",
  "ati.tn",
  "google.com",
  "github.com",
  "cloudflare.com",
  "microsoft.com",
  "wikipedia.org",
  "vercel.com",
]
