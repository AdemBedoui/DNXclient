import { NextResponse, type NextRequest } from "next/server"
import { isValidDomain, normalizeDomain } from "@/lib/dnx/domain"
import { rateLimited } from "@/lib/dnx/ratelimit"
import { runCheck } from "@/lib/dnx/run"
import { SECTIONS, type SectionName } from "@/lib/dnx/types"

export const runtime = "nodejs"
export const maxDuration = 30

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

  try {
    const result = await runCheck(section as SectionName, domain, req.nextUrl.searchParams.has("r"))
    return NextResponse.json(result, {
      headers: { "cache-control": "public, s-maxage=300, stale-while-revalidate=600" },
    })
  } catch (e) {
    console.error(`[check:${section}] ${domain}`, e)
    return NextResponse.json({ error: "Check failed" }, { status: 500 })
  }
}
