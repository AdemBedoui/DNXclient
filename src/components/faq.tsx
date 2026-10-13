export const FAQ: { q: string; a: string }[] = [
  {
    q: "What is a WHOIS lookup?",
    a: "WHOIS (and its modern replacement, RDAP) shows who a domain is registered through, when it was created, when it expires, its status locks and its name servers. DNX queries RDAP first and falls back to the registry's WHOIS server — including whois.ati.tn for .tn domains.",
  },
  {
    q: "How do I check if a .tn domain is available?",
    a: "Type the domain into DNX. If the Tunisian registry (ATI) has no record of it, DNX marks it as available and suggests other extensions such as .com.tn, .com and .net.",
  },
  {
    q: "Which DNS records does DNX show?",
    a: "All public records at the domain apex — SOA, NS, A, AAAA, CNAME, MX, TXT and CAA — with their TTLs, plus the www record, DNSSEC status and a propagation check across Cloudflare, Google, Quad9 and OpenDNS resolvers.",
  },
  {
    q: "What are SPF, DKIM and DMARC?",
    a: "They are DNS records that prove email really comes from your domain. SPF lists the servers allowed to send your mail, DKIM signs each message with a key published in DNS, and DMARC tells receivers what to do with mail that fails those checks. Missing or weak records let attackers spoof your domain and hurt deliverability.",
  },
  {
    q: "How is the domain health score calculated?",
    a: "Every check produces a finding — passed, suggestion, warning or critical. The score starts at 100 and loses points for each warning and critical issue (suggestions cost very little), giving a grade from A to F. Each issue comes with a plain-language fix.",
  },
  {
    q: "Is DNX free?",
    a: "Yes. DNX is free to use, needs no account, and every report has a shareable link such as dnx.tn/example.tn.",
  },
]

export function Faq() {
  return (
    <section aria-labelledby="faq-title" className="border-t border-line px-4 py-16 lg:px-8 xl:px-16">
      <div className="mb-8 flex items-center gap-4">
        <span className="font-mono text-[10.5px] text-brand">FAQ</span>
        <h2 id="faq-title" className="font-display text-2xl font-bold tracking-[0.12em] uppercase">Domain lookup, explained</h2>
        <span className="h-px flex-1 bg-gradient-to-r from-brand/50 to-transparent" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {FAQ.map(({ q, a }) => (
          <article key={q} className="hud p-5">
            <h3 className="font-display text-base font-semibold tracking-wide">{q}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{a}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
