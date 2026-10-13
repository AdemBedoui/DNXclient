import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { ThemeProvider } from "next-themes"
import { Toaster } from "sonner"
import { SiteFooter } from "@/components/site-footer"
import "./globals.css"

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] })
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] })

export const metadata: Metadata = {
  metadataBase: new URL("https://dnx.tn"),
  title: { default: "DNX — Domain health check", template: "%s · DNX" },
  description:
    "Check any domain's DNS, email security (SPF, DKIM, DMARC), SSL certificate, website security headers and WHOIS in seconds — with a health score and plain-language fixes.",
  openGraph: { siteName: "DNX", type: "website" },
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#14161c" },
    { media: "(prefers-color-scheme: light)", color: "#fbfbfd" },
  ],
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} flex min-h-dvh flex-col font-sans antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          {children}
          <SiteFooter />
          <Toaster position="bottom-center" theme="system" richColors />
        </ThemeProvider>
      </body>
    </html>
  )
}
