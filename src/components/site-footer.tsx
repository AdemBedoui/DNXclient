export function SiteFooter() {
  return (
    <footer className="relative z-10 mt-auto border-t border-line">
      <div className="flex flex-col gap-2 px-4 py-4 font-mono text-[11px] tracking-wider text-muted-foreground uppercase sm:flex-row sm:items-center sm:justify-between lg:px-8">
        <p>DNX // domain intelligence · DNS · Email · TLS · Web · WHOIS</p>
        <p>
          Need a domain?{" "}
          <a href="https://www.oxahost.com/domains/register" target="_blank" rel="noopener" className="text-brand hover:underline">
            Register on Oxahost →
          </a>
        </p>
      </div>
    </footer>
  )
}
