import "server-only"
import { publicIpFor } from "./resolve"
import type { Finding, RedirectHop, WebData } from "./types"

const UA = "Mozilla/5.0 (compatible; DNXBot/2.0; +https://dnx.tn)"
const MAX_HOPS = 8
const MAX_BODY = 300_000

const SECURITY_HEADERS = [
  "strict-transport-security",
  "content-security-policy",
  "x-frame-options",
  "x-content-type-options",
  "referrer-policy",
  "permissions-policy",
] as const

async function readBody(res: Response): Promise<string> {
  if (!res.body) return ""
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let out = ""
  while (out.length < MAX_BODY) {
    const { done, value } = await reader.read()
    if (done) break
    out += decoder.decode(value, { stream: true })
  }
  reader.cancel().catch(() => {})
  return out
}

function detectHosting(h: Headers, server = ""): string | undefined {
  const s = server.toLowerCase()
  if (h.has("cf-ray") || s === "cloudflare") return "Cloudflare"
  if (h.has("x-vercel-id") || s === "vercel") return "Vercel"
  if (h.has("x-nf-request-id") || s.includes("netlify")) return "Netlify"
  if (h.has("x-amz-cf-id")) return "Amazon CloudFront"
  if (h.has("x-github-request-id") || s === "github.com") return "GitHub Pages"
  if (h.get("x-served-by")?.includes("cache-") || h.has("x-fastly-request-id")) return "Fastly"
  if (s.includes("akamai") || h.has("x-akamai-transformed")) return "Akamai"
  if (h.has("x-azure-ref")) return "Azure Front Door"
  if (s.includes("gws") || s.includes("google frontend")) return "Google Cloud"
  if (h.has("x-wix-request-id")) return "Wix"
  if (h.has("x-shopify-stage") || h.has("x-shopid")) return "Shopify"
  if (s.includes("litespeed")) return "LiteSpeed server"
}

function detectTech(h: Headers, html: string): string[] {
  const t = new Set<string>()
  const gen = html.match(/<meta[^>]+name=["']generator["'][^>]+content=["']([^"']+)/i)?.[1]
  if (gen) t.add(gen.split(/\s+\d/)[0])
  if (/wp-content|wp-includes/.test(html)) t.add("WordPress")
  if (/__NEXT_DATA__|\/_next\/static/.test(html)) t.add("Next.js")
  if (/data-reactroot|react-dom/.test(html)) t.add("React")
  if (/__NUXT__|\/_nuxt\//.test(html)) t.add("Nuxt")
  if (/ng-version=/.test(html)) t.add("Angular")
  if (/cdn\.shopify\.com/.test(html)) t.add("Shopify")
  if (/static\.wixstatic\.com/.test(html)) t.add("Wix")
  if (/static1\.squarespace\.com/.test(html)) t.add("Squarespace")
  if (/Joomla!/.test(html)) t.add("Joomla")
  if (/drupal-settings-json|Drupal\.settings/.test(html)) t.add("Drupal")
  if (/var prestashop\s*=|\/modules\/ps_/.test(html)) t.add("PrestaShop")
  if (/googletagmanager\.com/.test(html)) t.add("Google Tag Manager")
  if (/google-analytics\.com|gtag\(/.test(html)) t.add("Google Analytics")
  const powered = h.get("x-powered-by")
  if (powered) t.add(powered)
  return [...t]
}

async function hop(url: string): Promise<Response> {
  const host = new URL(url).hostname
  if (!(await publicIpFor(host))) throw new Error(`${host} does not resolve to a public IP address`)
  return fetch(url, {
    redirect: "manual",
    headers: { "user-agent": UA, accept: "text/html,*/*" },
    signal: AbortSignal.timeout(8000),
    cache: "no-store",
  })
}

export async function checkWeb(domain: string): Promise<{ data: WebData; findings: Finding[] }> {
  const redirects: RedirectHop[] = []
  let url = `http://${domain}/`
  let res: Response | undefined
  const start = Date.now()

  try {
    for (let i = 0; i <= MAX_HOPS; i++) {
      res = await hop(url)
      if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
        redirects.push({ url, status: res.status })
        res.body?.cancel().catch(() => {})
        url = new URL(res.headers.get("location")!, url).toString()
        continue
      }
      break
    }
  } catch (e) {
    // Plain HTTP may be firewalled; try HTTPS directly before giving up.
    if (redirects.length === 0) {
      try {
        url = `https://${domain}/`
        res = await hop(url)
      } catch {
        res = undefined
      }
    }
    if (!res) {
      const data: WebData = { reachable: false, error: (e as Error).message, redirects, technologies: [], securityHeaders: {} }
      return { data, findings: [{ id: "web-down", category: "web", severity: "warn", title: "Website did not respond", detail: data.error }] }
    }
  }

  const responseMs = Date.now() - start
  const h = res!.headers
  const html = (h.get("content-type") ?? "").includes("html") ? await readBody(res!) : ""
  const title = html.match(/<title[^>]*>([^<]{1,200})<\/title>/i)?.[1]?.trim()

  const data: WebData = {
    reachable: true,
    finalUrl: url,
    status: res!.status,
    httpsRedirect: url.startsWith("https://"),
    redirects,
    server: h.get("server") ?? undefined,
    poweredBy: h.get("x-powered-by") ?? undefined,
    hosting: detectHosting(h, h.get("server") ?? ""),
    technologies: detectTech(h, html),
    securityHeaders: Object.fromEntries(SECURITY_HEADERS.map((k) => [k, h.get(k)])),
    title: title ? decodeEntities(title) : undefined,
    responseMs,
  }
  return { data, findings: webFindings(data) }
}

function decodeEntities(s: string) {
  return s.replace(/&amp;/g, "&").replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">")
}

function webFindings(d: WebData): Finding[] {
  const f: Finding[] = []
  const c = "web" as const
  const s = "security" as const
  const sh = d.securityHeaders

  if ((d.status ?? 0) >= 500) f.push({ id: "web-5xx", category: c, severity: "fail", title: `Website returns an error (HTTP ${d.status})`, fix: "Check your server logs; the site is down for visitors." })
  else if ((d.status ?? 0) >= 400) f.push({ id: "web-4xx", category: c, severity: "warn", title: `Homepage returns HTTP ${d.status}` })
  else f.push({ id: "web-ok", category: c, severity: "pass", title: `Website online (HTTP ${d.status}, ${d.responseMs} ms)` })

  if (d.httpsRedirect) f.push({ id: "web-https", category: c, severity: "pass", title: "HTTP redirects to HTTPS" })
  else f.push({ id: "web-no-https", category: c, severity: "fail", title: "Site is served over plain HTTP", detail: "Browsers mark the site as 'Not secure' and traffic can be intercepted.", fix: "Install a certificate and redirect all http:// requests to https://." })

  if (d.redirects.length > 3) f.push({ id: "web-chain", category: c, severity: "info", title: `Long redirect chain (${d.redirects.length} hops)`, fix: "Redirect straight to the final URL to save load time." })

  if (d.httpsRedirect) {
    const hsts = sh["strict-transport-security"]
    const maxAge = Number(hsts?.match(/max-age\s*=\s*"?(\d+)/i)?.[1] ?? 0)
    if (!hsts) f.push({ id: "hdr-hsts", category: s, severity: "warn", title: "HSTS header missing", fix: "Add: Strict-Transport-Security: max-age=31536000; includeSubDomains" })
    else if (maxAge === 0) f.push({ id: "hdr-hsts-zero", category: s, severity: "warn", title: "HSTS is disabled (max-age=0)", detail: "A max-age of 0 tells browsers to forget the HSTS policy, so it has no effect.", fix: "Set max-age to at least 15552000 (180 days), e.g. max-age=31536000; includeSubDomains" })
    else if (maxAge < 15_552_000) f.push({ id: "hdr-hsts-short", category: s, severity: "info", title: `HSTS max-age is short (${Math.round(maxAge / 86400)} days)`, fix: "Use max-age=31536000 (1 year) once HTTPS is stable." })
    else f.push({ id: "hdr-hsts-ok", category: s, severity: "pass", title: "HSTS enabled" })
  }
  if (!sh["content-security-policy"]) f.push({ id: "hdr-csp", category: s, severity: "info", title: "No Content-Security-Policy", fix: "A CSP limits where scripts can load from and blocks most XSS attacks." })
  if (!sh["x-frame-options"] && !/frame-ancestors/i.test(sh["content-security-policy"] ?? "")) {
    f.push({ id: "hdr-xfo", category: s, severity: "info", title: "Clickjacking protection missing", fix: "Add X-Frame-Options: SAMEORIGIN (or CSP frame-ancestors 'self')." })
  }
  if (!sh["x-content-type-options"]) f.push({ id: "hdr-xcto", category: s, severity: "info", title: "X-Content-Type-Options missing", fix: "Add: X-Content-Type-Options: nosniff" })
  if (d.server && /\d/.test(d.server)) f.push({ id: "hdr-server", category: s, severity: "info", title: `Server version exposed (${d.server})`, fix: "Hide version numbers in the Server header (e.g. server_tokens off in nginx)." })
  return f
}
