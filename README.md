# DNX — domain health check

DNX checks a domain's registration, DNS, email security, SSL/TLS and website in one search, gives it a score, and explains how to fix each problem in plain language.

Live at **[dnx.tn](https://dnx.tn)**. You can share a report by linking to `dnx.tn/<domain>`.

## What it checks

| Area | Checks |
|---|---|
| Registration | Uses RDAP first and falls back to port-43 WHOIS (.tn goes through `whois.ati.tn`). Shows registrar, created/expiry dates, status locks and contacts. |
| DNS | A, AAAA, CNAME, NS, MX, TXT, CAA and SOA records, DNSSEC, and propagation across Cloudflare, Google, Quad9 and OpenDNS. |
| Email | SPF (including the 10-lookup limit), DMARC policy, DKIM on 26 common selectors, MTA-STS, TLS-RPT, BIMI, and mail provider detection. |
| SSL/TLS | Trust, expiry, covered names (including `www`), certificate chain, protocol and cipher. |
| Website | HTTP to HTTPS redirect, redirect chain, response time, security headers, hosting/CDN and detected technologies. |
| Network | ASN, prefix and country (via Team Cymru) and reverse DNS. |

## Stack

- Next.js 16 (App Router), React 19, Tailwind CSS 4, Radix UI, `next-themes`
- The check engine is in `src/lib/dnx/` and runs in Node route handlers. It doesn't need API keys or any external binaries.

```
src/
  app/
    page.tsx                     home
    [domain]/page.tsx            report page (shareable URL)
    api/check/[section]/route.ts GET /api/check/{registration|dns|email|ssl|web|network}?domain=
  lib/dnx/                       check engine (server-only, except types/domain/score)
  components/report/             report UI (sections load progressively)
```

Each section is a separate API call, so the UI fills in as each check finishes. Responses are cached at the CDN for 5 minutes (`s-maxage=300`).

## Development

```bash
npm install
npm run dev        # http://localhost:3000
npm run lint
npm run build
```

## Security notes

- Inputs are checked as valid public hostnames, and the SSL and HTTP checks only connect to **public** IP addresses (including every redirect hop). This stops the tool from being used to probe internal networks.
- A best-effort rate limit of 60 requests per minute per IP is applied in each running instance. For hard limits, use Vercel Firewall rate-limiting rules.
