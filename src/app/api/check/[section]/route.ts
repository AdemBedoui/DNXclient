import { NextResponse, type NextRequest } from "next/server"
import { cached } from "@/lib/dnx/cache"
import { checkDns } from "@/lib/dnx/dns"
import { isValidDomain, normalizeDomain } from "@/lib/dnx/domain"
import { checkEmail } from "@/lib/dnx/email"
import { checkNetwork } from "@/lib/dnx/network"
import { rateLimited } from "@/lib/dnx/ratelimit"
import { checkRegistration } from "@/lib/dnx/registration"
import { checkSsl } from "@/lib/dnx/ssl"
import { SECTIONS, type SectionName } from "@/lib/dnx/types"
import { checkWeb } from "@/lib/dnx/web"

export const runtime = "nodejs"
export const maxDuration = 30

const CHECKS = {
  registration: checkRegistration,
  dns: checkDns,
  email: checkEmail,
  ssl: checkSsl,
  web: checkWeb,
  network: checkNetwork,
} satisfies Record<SectionName, (d: string) => Promise<unknown>>

const TTL_MS = 5 * 60_000

export async function GET(req: NextRequest, ctx: RouteContext<"/api/check/[section]">) {
  const { section } = await ctx.params
  if (!SECTIONS.includes(section as SectionName)) {
    return NextResponse.json({ error: "Unknown section" }, { status: 404 })
  }

  const domain = normalizeDomain(req.nextUrl.searchParams.get("domain") ?? "")
  if (!isValidDomain(domain)) {
    return NextResponse.json({ error: "Invalid domain name" }, { status: 400 })
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "local"
  if (rateLimited(ip)) {
    return NextResponse.json({ error: "Too many requests — please wait a minute." }, { status: 429 })
  }

  const start = Date.now()
  try {
    const check: (d: string) => Promise<unknown> = CHECKS[section as SectionName]
    const fresh = req.nextUrl.searchParams.has("r")
    const result = fresh ? await check(domain) : await cached(`${section}:${domain}`, TTL_MS, () => check(domain))
    return NextResponse.json(
      { ...(result as object), durationMs: Date.now() - start },
      { headers: { "cache-control": "public, s-maxage=300, stale-while-revalidate=600" } },
    )
  } catch (e) {
    console.error(`[check:${section}] ${domain}`, e)
    return NextResponse.json({ error: "Check failed" }, { status: 500 })
  }
}
