export function SiteFooter() {
  return (
    <footer className="mt-auto border-t">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>DNX — domain health checks for DNS, email, SSL and the web.</p>
        <p>
          Need a domain?{" "}
          <a href="https://www.oxahost.com/domains/register" target="_blank" rel="noopener" className="font-medium text-foreground underline-offset-4 hover:underline">
            Register on Oxahost
          </a>
        </p>
      </div>
    </footer>
  )
}
