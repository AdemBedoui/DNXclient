import Link from "next/link"
import { cn } from "@/lib/utils"

/** `compact` hides the wordmark on small screens to make room for the header search. */
export function Logo({ size = "md", compact }: { size?: "md" | "lg"; compact?: boolean }) {
  const box = size === "lg" ? "size-10" : "size-8"
  return (
    <Link href="/" className="group flex shrink-0 items-center gap-2.5" aria-label="DNX home">
      <svg viewBox="0 0 32 32" className={cn(box, "text-brand")} aria-hidden>
        <path d="M16 2 29 9.5v13L16 30 3 22.5v-13Z" fill="none" stroke="currentColor" strokeWidth="1.5" opacity=".5" />
        <path d="M16 7 24.5 12v8L16 25l-8.5-5v-8Z" fill="currentColor" opacity=".12" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="16" cy="16" r="2.6" fill="currentColor" className="origin-center transition group-hover:scale-125" />
      </svg>
      <span className={cn("font-display font-bold tracking-[0.2em]", size === "lg" ? "text-xl" : "text-base", compact && "hidden sm:inline")}>
        DNX
      </span>
    </Link>
  )
}
