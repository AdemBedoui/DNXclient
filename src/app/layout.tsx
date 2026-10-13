import type { Metadata, Viewport } from "next"
import { Chakra_Petch, Geist, Geist_Mono } from "next/font/google"
import { ThemeProvider } from "next-themes"
import { Toaster } from "sonner"
import { SiteFooter } from "@/components/site-footer"
import "./globals.css"

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] })
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] })
const chakra = Chakra_Petch({ variable: "--font-chakra", subsets: ["latin"], weight: ["500", "600", "700"] })

export const metadata: Metadata = {
  metadataBase: new URL("https://dnx.tn"),
  title: { default: "DNX — Domain intelligence", template: "%s · DNX" },
  description:
    "Full domain intelligence in one scan: WHOIS, every DNS record, IP & network, SSL, email authentication (SPF, DKIM, DMARC) and web security — with a health score and fixes.",
  openGraph: { siteName: "DNX", type: "website" },
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0b0e18" },
    { media: "(prefers-color-scheme: light)", color: "#eef3f7" },
  ],
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} ${chakra.variable} flex min-h-dvh flex-col font-sans antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          <div className="scanline" aria-hidden />
          <div className="relative z-10 flex flex-1 flex-col">{children}</div>
          <SiteFooter />
          <Toaster position="bottom-center" theme="system" richColors />
        </ThemeProvider>
      </body>
    </html>
  )
}
