"use client"

import { ArrowRight, Loader2 } from "lucide-react"
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
          "hud flex items-center gap-3 transition focus-within:shadow-[0_0_0_1px_var(--brand),0_0_32px_-6px_var(--brand)]",
          lg ? "p-2 pl-5" : "p-1 pl-3",
          error && "border-fail/60",
        )}
      >
        <span className={cn("shrink-0 font-mono text-brand select-none", lg ? "text-lg" : "text-sm")} aria-hidden>
          {lg ? "scan://" : ">"}
        </span>
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
          placeholder={lg ? "example.tn" : "scan another domain"}
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            if (error) setError(null)
          }}
          className={cn(
            "min-w-0 flex-1 bg-transparent font-mono caret-brand outline-none placeholder:text-muted-foreground/50",
            lg ? "h-12 text-lg sm:text-xl" : "h-8 text-sm",
          )}
        />
        <button
          type="submit"
          disabled={pending || !value.trim()}
          className={cn(
            "inline-flex shrink-0 items-center gap-2 bg-brand font-mono font-semibold tracking-widest text-brand-foreground uppercase transition hover:shadow-[0_0_24px_-2px_var(--brand)] disabled:opacity-40 disabled:hover:shadow-none",
            lg ? "h-12 px-6 text-sm" : "h-8 px-3 text-xs",
          )}
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : !lg && <ArrowRight className="size-4" />}
          {lg ? (pending ? "Scanning" : "Scan") : <span className="sr-only">Scan</span>}
        </button>
      </div>
      {error && (
        <p id="search-error" role="alert" className="mt-2 px-1 font-mono text-xs text-fail">
          ! {error}
        </p>
      )}
    </form>
  )
}
