import Link from "next/link"
import { cn } from "@/lib/utils"

/** `compact` hides the wordmark on small screens to make room for the header search. */
export function Logo({ size = "md", compact }: { size?: "md" | "lg"; compact?: boolean }) {
  const box = size === "lg" ? "size-10 text-base" : "size-8 text-sm"
  return (
    <Link href="/" className="flex shrink-0 items-center gap-2.5 font-semibold tracking-tight" aria-label="DNX home">
      <span className={`${box} grid place-items-center rounded-lg bg-brand font-mono font-bold text-brand-foreground shadow-sm`}>
        DX
      </span>
      <span className={cn(size === "lg" ? "text-xl" : "text-base", compact && "hidden sm:inline")}>DNX</span>
    </Link>
  )
}
