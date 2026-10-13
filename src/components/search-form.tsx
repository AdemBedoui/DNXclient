"use client"

import { ArrowRight, Loader2, Search } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { normalizeDomain, validationMessage } from "@/lib/dnx/domain"
import { cn } from "@/lib/utils"

export function SearchForm({
  size = "lg",
  defaultValue = "",
  autoFocus,
  className,
}: {
  size?: "lg" | "sm"
  defaultValue?: string
  autoFocus?: boolean
  className?: string
}) {
  const router = useRouter()
  const [value, setValue] = useState(defaultValue)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const lg = size === "lg"

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const msg = validationMessage(value)
    if (msg) return setError(msg)
    const domain = normalizeDomain(value)
    setValue(domain)
    startTransition(() => router.push(`/${domain}`))
  }

  return (
    <form onSubmit={submit} className={cn("w-full", className)} role="search">
      <div
        className={cn(
          "group flex items-center gap-2 rounded-xl border bg-card shadow-sm transition focus-within:border-brand/60 focus-within:ring-4 focus-within:ring-brand/15",
          lg ? "p-2 pl-4" : "p-1 pl-3",
          error && "border-fail/60",
        )}
      >
        <Search className={cn("shrink-0 text-muted-foreground", lg ? "size-5" : "size-4")} aria-hidden />
        <input
          type="text"
          inputMode="url"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          autoFocus={autoFocus}
          aria-label="Domain name"
          aria-invalid={!!error}
          aria-describedby={error ? "search-error" : undefined}
          placeholder={lg ? "Enter a domain, e.g. example.tn" : "Check another domain"}
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            if (error) setError(null)
          }}
          className={cn(
            "min-w-0 flex-1 bg-transparent font-mono outline-none placeholder:font-sans placeholder:text-muted-foreground/70",
            lg ? "h-11 text-lg" : "h-8 text-sm",
          )}
        />
        <button
          type="submit"
          disabled={pending || !value.trim()}
          className={cn(
            "inline-flex shrink-0 items-center gap-2 rounded-lg bg-brand font-medium text-brand-foreground transition hover:brightness-110 disabled:opacity-50",
            lg ? "h-11 px-5" : "h-8 px-3 text-sm",
          )}
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : lg ? null : <ArrowRight className="size-4" />}
          {lg ? (pending ? "Checking…" : "Check domain") : <span className="sr-only">Check</span>}
        </button>
      </div>
      {error && (
        <p id="search-error" role="alert" className="mt-2 px-1 text-sm text-fail">
          {error}
        </p>
      )}
    </form>
  )
}
