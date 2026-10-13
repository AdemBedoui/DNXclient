import { Logo } from "@/components/logo"
import { SearchForm } from "@/components/search-form"

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-6 px-4 py-24 text-center">
      <Logo size="lg" />
      <div>
        <h1 className="text-2xl font-semibold">That doesn&apos;t look like a domain</h1>
        <p className="mt-2 text-muted-foreground">Try a full domain name such as example.tn or example.com.</p>
      </div>
      <SearchForm autoFocus className="text-left" />
    </main>
  )
}
