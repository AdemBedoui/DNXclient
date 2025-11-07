"use client"

import type React from "react"
import { useState, useEffect } from "react"
import {
  Search,
  Globe,
  Shield,
  Calendar,
  Server,
  Mail,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Building,
  HelpCircle,
  Copy,
  Check,
  Cloud,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface DomainResult {
  domain: string
  status: string
  ip_address?: string
  domain_status?: string[]
  A?: string[]
  MX?: string[]
  SPF?: string[]
  DKIM?: string[]
  DMARC?: string[]
  reverse_dns?: string
  registration_date?: string
  registrar_name?: string
  nameservers?: string[]
  registrant?: string
  admin_contact?: string
  ssl?: {
    status: string
    issuer?: string
    valid_from?: string
    valid_until?: string
    days_until_expiry?: number
    error?: string
  }
  error?: string
}

interface IPLocationData {
  continent?: string
  country?: string
  city?: string
  isp?: string
  org?: string
  loading?: boolean
  error?: string
}

// ✅ Nouveau type ajouté ici
type IPApiResponse = {
  continent?: string
  continent_code?: string
  country?: string
  country_name?: string
  city?: string
  isp?: string
  org?: string
  error?: string
  status?: string
}

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case "registered":
      return "bg-emerald-500 hover:bg-emerald-600"
    case "available":
      return "bg-blue-500 hover:bg-blue-600"
    case "error":
      return "bg-red-500 hover:bg-red-600"
    default:
      return "bg-slate-500 hover:bg-slate-600"
  }
}

export default function DNXAnalyzer() {
  const [searchTerm, setSearchTerm] = useState("")
  const [results, setResults] = useState<DomainResult[]>([])
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [ipLocationData, setIpLocationData] = useState<{ [key: string]: IPLocationData }>({})
  const [copiedItems, setCopiedItems] = useState<{ [key: string]: boolean }>({})
  const [validationError, setValidationError] = useState<string | null>(null)
  const [isClient, setIsClient] = useState(false);

  useEffect(() => setIsClient(true), []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    setValidationError(null)
    if (!searchTerm.trim()) return

    if (!searchTerm.includes(".")) {
      setValidationError("Please enter a full domain name, including the extension (e.g., example.com, example.tn).")
      return
    }

    setLoading(true)
    try {
      const response = await fetch("https://dn-xapi.vercel.app/api/check-domain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: searchTerm.trim() }),
      })
      const data = await response.json()

      if (response.ok) {
        setResults([data])
        setHasSearched(true)
      } else {
        setResults([{ domain: searchTerm.trim(), status: "Error", error: data.error || "Unknown error" }])
        setHasSearched(true)
      }
    } catch {
      setResults([{ domain: searchTerm.trim(), status: "Error", error: "Failed to connect to API" }])
      setHasSearched(true)
    } finally {
      setLoading(false)
    }
  }

  const handleSearchTermChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
    if (validationError) setValidationError(null)
  }

  const fetchIPLocation = async (ip: string) => {
    if (ipLocationData[ip] && !ipLocationData[ip].loading) return

    setIpLocationData((prev) => ({
      ...prev,
      [ip]: { loading: true },
    }))

    try {
      let response: Response
      let data: IPApiResponse

      try {
        response = await fetch(`https://ipapi.co/${ip}/json/`)
        data = await response.json()

        if (response.ok && data && !data.error) {
          setIpLocationData((prev) => ({
            ...prev,
            [ip]: {
              continent: data.continent_code,
              country: data.country_name,
              city: data.city,
              isp: data.org,
              org: data.org,
              loading: false,
            },
          }))
          return
        }
      } catch {
        console.log("ipapi.co failed, trying alternative...")
      }

      try {
        response = await fetch(
          `https://cors-anywhere.herokuapp.com/http://ip-api.com/json/${ip}?fields=continent,country,city,isp,org,query`
        )
        data = await response.json()

        if (data.status === "success") {
          setIpLocationData((prev) => ({
            ...prev,
            [ip]: {
              continent: data.continent,
              country: data.country,
              city: data.city,
              isp: data.isp,
              org: data.org,
              loading: false,
            },
          }))
          return
        }
      } catch {
        console.log("ip-api.com with proxy failed...")
      }

      try {
        response = await fetch(`https://ipinfo.io/${ip}/json`)
        data = await response.json()

        if (response.ok && data && !data.error) {
          setIpLocationData((prev) => ({
            ...prev,
            [ip]: {
              continent: data.continent,
              country: data.country,
              city: data.city,
              isp: data.org,
              org: data.org,
              loading: false,
            },
          }))
          return
        }
      } catch {
        console.log("ipinfo.io failed...")
      }

      setIpLocationData((prev) => ({
        ...prev,
        [ip]: {
          error: "Location data not available",
          loading: false,
        },
      }))
    } catch {
      console.error("All IP location services failed.")
      setIpLocationData((prev) => ({
        ...prev,
        [ip]: {
          error: "Failed to fetch location data",
          loading: false,
        },
      }))
    }
  }

  const copyToClipboard = async (text: string, key: string) => {
    if (typeof window !== "undefined") {
      try {
        await navigator.clipboard.writeText(text)
        setCopiedItems((prev) => ({ ...prev, [key]: true }))
        setTimeout(() => setCopiedItems((prev) => ({ ...prev, [key]: false })), 2000)
      } catch (err) {
        console.error("Failed to copy text: ", err)
      }
    }
  }

  const formatDomainStatus = (statuses: string[] | undefined) => {
    if (!statuses || statuses.length === 0) return []
    return statuses.map((status) => {
      switch (status.toLowerCase()) {
        case "registered":
          return "Registered"
        case "available":
          return "Available"
        case "error":
          return "Error"
        default:
          return status
      }
    })
  }

  const getSSLStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "valid":
        return "bg-emerald-500"
      case "expired":
        return "bg-red-500"
      case "invalid":
        return "bg-red-500"
      case "unknown":
        return "bg-slate-500"
      default:
        return "bg-slate-500"
    }
  }

  const getSSLStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "valid":
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case "expired":
        return <XCircle className="w-4 h-4 text-red-600" />
      case "invalid":
        return <AlertCircle className="w-4 h-4 text-red-600" />
      case "unknown":
        return <HelpCircle className="w-4 h-4 text-slate-600" />
      default:
        return <HelpCircle className="w-4 h-4 text-slate-600" />
    }
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-slate-50">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 shadow-sm">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl shadow-lg">
                  <Globe className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">DNX</h1>
                  <p className="text-sm text-slate-500">Domain Analysis Tool</p>
                </div>
              </div>

              {/* Search bar in navbar when results are shown */}
              {hasSearched && (
                <form onSubmit={handleSearch} className="flex flex-col gap-2 flex-1 max-w-md ml-8">
                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                      <Input
                        type="text"
                        placeholder="Enter domain name"
                        value={searchTerm}
                        onChange={handleSearchTermChange} // Use new handler
                        className="pl-10 h-10 border-slate-300 focus:border-blue-500 focus:ring-blue-500 rounded-lg"
                        disabled={loading}
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={loading || !searchTerm.trim()}
                      className="h-10 px-6 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium"
                    >
                      {loading ? "..." : "Analyze"}
                    </Button>
                  </div>
                  {validationError && (
                    <Card className="border-red-200 bg-red-50 text-red-700 p-2 text-sm">
                      <CardContent className="flex items-center gap-2 p-0">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        <span>{validationError}</span>
                      </CardContent>
                    </Card>
                  )}
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Initial Search Section - only shown when no search has been made */}
        {!hasSearched && (
          <div className="container mx-auto px-6 py-24">
            <div className="max-w-3xl mx-auto mt-16">
              <div className="text-center mb-12">
                <h2 className="text-5xl font-bold text-slate-900 mb-6 tracking-tight">Analyze Any Domain</h2>
                <p className="text-xl text-slate-600 leading-relaxed">
                  Get comprehensive domain information including DNS records, SSL certificates, and WHOIS data
                </p>
              </div>

              <form onSubmit={handleSearch} className="flex flex-col gap-3">
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <Input
                      type="text"
                      placeholder="Enter domain name (e.g., example.com)"
                      value={searchTerm}
                      onChange={handleSearchTermChange} // Use new handler
                      className="pl-12 h-14 text-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500 rounded-xl shadow-sm"
                      disabled={loading}
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={loading || !searchTerm.trim()}
                    className="h-14 px-8 bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm font-medium"
                  >
                    {loading ? "Analyzing..." : "Analyze"}
                  </Button>
                </div>
                {validationError && (
                  <Card className="border-red-200 bg-red-50 text-red-700 p-3 text-base">
                    <CardContent className="flex items-center gap-2 p-0">
                      <AlertCircle className="w-5 h-5 flex-shrink-0" />
                      <span>{validationError}</span>
                    </CardContent>
                  </Card>
                )}
              </form>
            </div>
          </div>
        )}

        {/* Results Section */}
        {hasSearched && (
          <div className="container mx-auto px-6 py-8">
            <div className="max-w-7xl mx-auto space-y-8">
              {results.map((result, index) => (
                <div key={index} className="space-y-6">
                  {result.error ? (
                    <Card className="border-red-200 bg-red-50">
                      <CardContent className="p-6">
                        <div className="flex items-center gap-3">
                          <XCircle className="w-6 h-6 text-red-600" />
                          <div>
                            <h3 className="font-semibold text-red-900">{result.domain}</h3>
                            <p className="text-red-700">Error: {result.error}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <>
                      {/* Domain Overview Row - Conditionally rendered based on availability */}
                      {result.status.toLowerCase() === "available" ? (
                        <Card className="border-slate-200 shadow-sm">
                          <CardHeader className="pb-4">
                            <div className="flex items-center gap-3">
                              <Globe className="w-5 h-5 text-slate-600" />
                              <CardTitle className="text-lg">Domain Information</CardTitle>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                              <span className="text-2xl font-bold text-slate-900">{result.domain}</span>
                              <Badge className={`${getStatusColor(result.status)} text-white px-3 py-1`}>
                                {result.status}
                              </Badge>
                            </div>
                            <div className="text-center p-4 bg-blue-50 border border-blue-200 rounded-lg">
                              <p className="text-blue-800 font-medium mb-2">
                                This domain is available for registration!
                              </p>
                              <a
                                href="https://www.oxahost.com/domains/register"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline font-semibold"
                              >
                                Register it now on Oxahost.com
                              </a>
                            </div>
                          </CardContent>
                        </Card>
                      ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {/* Domain Information with Contact Info */}
                          <Card className="border-slate-200 shadow-sm">
                            <CardHeader className="pb-4">
                              <div className="flex items-center gap-3">
                                <Globe className="w-5 h-5 text-slate-600" />
                                <CardTitle className="text-lg">Domain Information</CardTitle>
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <div className="flex items-center justify-between">
                                <span className="text-2xl font-bold text-slate-900">{result.domain}</span>
                                <Badge className={`${getStatusColor(result.status)} text-white px-3 py-1`}>
                                  {result.status}
                                </Badge>
                              </div>

                              {result.ip_address && (
                                <div className="flex items-center gap-2 text-sm">
                                  <Server className="w-4 h-4 text-slate-500" />
                                  <span className="text-slate-600">IP Address:</span>
                                  <code className="bg-slate-100 px-2 py-1 rounded text-slate-800 font-mono">
                                    {result.ip_address}
                                  </code>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        className="ml-1 text-slate-400 hover:text-slate-600 transition-colors"
                                        onMouseEnter={() => fetchIPLocation(result.ip_address!)}
                                      >
                                        <HelpCircle className="w-4 h-4" />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs p-3 bg-white border border-slate-200 shadow-lg rounded-lg z-50 text-slate-900">
                                      <div className="space-y-2">
                                        {ipLocationData[result.ip_address!]?.loading ? (
                                          <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 border border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                            <p className="text-sm">Loading location data...</p>
                                          </div>
                                        ) : ipLocationData[result.ip_address!]?.error ? (
                                          <div className="space-y-1">
                                            <p className="text-sm text-red-600">
                                              {ipLocationData[result.ip_address!].error}
                                            </p>
                                            <p className="text-xs text-slate-500">
                                              IP location services may be blocked by CORS policy
                                            </p>
                                          </div>
                                        ) : ipLocationData[result.ip_address!] ? (
                                          <div className="space-y-1.5 text-sm">
                                            <div className="font-medium text-slate-900 border-b border-slate-200 pb-1 mb-2">
                                              IP Location Info
                                            </div>
                                            {ipLocationData[result.ip_address!].continent && (
                                              <div className="flex justify-between">
                                                <span className="text-slate-600">Continent:</span>
                                                <span className="font-medium text-slate-900">
                                                  {ipLocationData[result.ip_address!].continent}
                                                </span>
                                              </div>
                                            )}
                                            {ipLocationData[result.ip_address!].country && (
                                              <div className="flex justify-between">
                                                <span className="text-slate-600">Country:</span>
                                                <span className="font-medium text-slate-900">
                                                  {ipLocationData[result.ip_address!].country}
                                                </span>
                                              </div>
                                            )}
                                            {ipLocationData[result.ip_address!].city && (
                                              <div className="flex justify-between">
                                                <span className="text-slate-600">City:</span>
                                                <span className="font-medium text-slate-900">
                                                  {ipLocationData[result.ip_address!].city}
                                                </span>
                                              </div>
                                            )}
                                            {ipLocationData[result.ip_address!].isp && (
                                              <div className="flex justify-between">
                                                <span className="text-slate-600">ISP:</span>
                                                <span className="font-medium text-slate-900">
                                                  {ipLocationData[result.ip_address!].isp}
                                                </span>
                                              </div>
                                            )}
                                            {ipLocationData[result.ip_address!].org && (
                                              <div className="flex justify-between">
                                                <span className="text-slate-600">Organization:</span>
                                                <span className="font-medium text-slate-900">
                                                  {ipLocationData[result.ip_address!].org}
                                                </span>
                                              </div>
                                            )}
                                          </div>
                                        ) : (
                                          <p className="text-sm text-slate-500">Hover to load location data</p>
                                        )}
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                              )}

                              {result.domain_status && result.domain_status.length > 0 && (
                                <div className="space-y-2">
                                  <span className="text-sm font-medium text-slate-700">Domain Status:</span>
                                  <div className="flex flex-wrap gap-1">
                                    {formatDomainStatus(result.domain_status).map((status, i) => (
                                      <Badge
                                        key={i}
                                        variant="outline"
                                        className="text-xs bg-slate-50 text-slate-700 border-slate-300"
                                      >
                                        {status}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {(result.registration_date || result.registrar_name) && (
                                <div className="pt-2 space-y-2 border-t border-slate-100">
                                  {result.registration_date && (
                                    <div className="flex items-center gap-2 text-sm">
                                      <Calendar className="w-4 h-4 text-slate-500" />
                                      <span className="text-slate-600">Registered:</span>
                                      <span className="text-slate-800 font-medium">{result.registration_date}</span>
                                    </div>
                                  )}
                                  {result.registrar_name && (
                                    <div className="flex items-center gap-2 text-sm">
                                      <Building className="w-4 h-4 text-slate-500" />
                                      <span className="text-slate-600">Registrar:</span>
                                      <span className="text-slate-800 font-medium">{result.registrar_name}</span>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Contact Information integrated here */}
                              {(result.registrant) && (
                                <div className="pt-2 space-y-2 border-t border-slate-100">
                                  <div className="flex items-center gap-2 mb-2">
                                    <User className="w-4 h-4 text-slate-500" />
                                    <span className="text-sm font-medium text-slate-700">Contact Information</span>
                                  </div>
                                  {result.registrant && (
                                    <div className="text-sm">
                                      <span className="text-slate-600">Owner:</span>
                                      <span className="text-slate-800 font-medium ml-2">{result.registrant}</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </CardContent>
                          </Card>

                          {/* SSL Information */}
                          <Card className="border-slate-200 shadow-sm">
                            <CardHeader className="pb-4">
                              <div className="flex items-center gap-3">
                                <Shield className="w-5 h-5 text-slate-600" />
                                <CardTitle className="text-lg">SSL Certificate</CardTitle>
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              {result.ssl ? (
                                <>
                                  <div
                                    className={`flex items-center gap-3 p-3 rounded-lg border ${getSSLStatusColor(result.ssl.status)}`}
                                  >
                                    {getSSLStatusIcon(result.ssl.status)}
                                    <div>
                                      <span className="font-medium">{result.ssl.status}</span>
                                      {result.ssl.error && <p className="text-sm opacity-80">{result.ssl.error}</p>}
                                    </div>
                                  </div>

                                  {result.ssl.issuer && (
                                    <div className="flex items-center gap-2 text-sm">
                                      <Server className="w-4 h-4 text-slate-500" />
                                      <span className="text-slate-600">Issuer:</span>
                                      <span className="text-slate-800 font-medium">{result.ssl.issuer}</span>
                                    </div>
                                  )}

                                  {result.ssl.valid_until && (
                                    <div className="flex items-center gap-2 text-sm">
                                      <Calendar className="w-4 h-4 text-slate-500" />
                                      <span className="text-slate-600">Expires:</span>
                                      <span className="text-slate-800 font-medium">{result.ssl.valid_until}</span>
                                    </div>
                                  )}

                                  {result.ssl.days_until_expiry !== undefined && (
                                    <div className="flex items-center gap-2 text-sm">
                                      <Clock className="w-4 h-4 text-slate-500" />
                                      <span className="text-slate-600">Days remaining:</span>
                                      <span
                                        className={`font-medium ${
                                          result.ssl.days_until_expiry < 30
                                            ? "text-red-600"
                                            : result.ssl.days_until_expiry < 90
                                              ? "text-amber-600"
                                              : "text-emerald-600"
                                        }`}
                                      >
                                        {result.ssl.days_until_expiry} days
                                      </span>
                                    </div>
                                  )}
                                </>
                              ) : (
                                <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50">
                                  <AlertCircle className="w-4 h-4 text-slate-500" />
                                  <span className="text-slate-600">No SSL certificate information available</span>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        </div>
                      )}

                      {/* DNS Records and Email Security Side by Side - Conditionally rendered */}
                      {result.status.toLowerCase() !== "available" && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {/* DNS Records Section */}
                          <Card className="border-slate-200 shadow-sm">
                            <CardHeader>
                              <div className="flex items-center gap-3">
                                <Server className="w-5 h-5 text-slate-600" />
                                <CardTitle className="text-lg">DNS Records</CardTitle>
                              </div>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-6">
                                {/* A Records with Reverse DNS */}
                                {result.A && result.A.length > 0 && (
                                  <div className="space-y-3">
                                    <h4 className="font-semibold text-slate-900">A Records</h4>
                                    <div className="space-y-2">
                                      {result.A.map((record, i) => (
                                        <div key={i} className="bg-slate-50 p-3 rounded-lg">
                                          <div className="flex items-center justify-between gap-2">
                                            <Server className="w-4 h-4 text-blue-500 flex-shrink-0" />
                                            <code className="text-sm font-mono text-slate-800 flex-1">{record}</code>
                                            <button
                                              onClick={() => copyToClipboard(record, `a-${i}`)}
                                              className="ml-2 p-1 text-slate-400 hover:text-slate-600 transition-colors"
                                              title="Copy to clipboard"
                                            >
                                              {copiedItems[`a-${i}`] ? (
                                                <Check className="w-4 h-4 text-green-600" />
                                              ) : (
                                                <Copy className="w-4 h-4" />
                                              )}
                                            </button>
                                          </div>
                                          {result.reverse_dns && i === 0 && (
                                            <div className="mt-2 pt-2 border-t border-slate-200">
                                              <div className="flex items-center justify-between gap-2">
                                                <HelpCircle className="w-4 h-4 text-slate-500 flex-shrink-0" />
                                                <div className="flex-1">
                                                  <span className="text-xs text-slate-500">Reverse DNS:</span>
                                                  <code className="text-xs font-mono text-slate-700 block mt-1">
                                                    {result.reverse_dns}
                                                  </code>
                                                </div>
                                                <button
                                                  onClick={() => copyToClipboard(result.reverse_dns!, `reverse-dns`)}
                                                  className="ml-2 p-1 text-slate-400 hover:text-slate-600 transition-colors"
                                                  title="Copy reverse DNS"
                                                >
                                                  {copiedItems[`reverse-dns`] ? (
                                                    <Check className="w-3 h-3 text-green-600" />
                                                  ) : (
                                                    <Copy className="w-3 h-3" />
                                                  )}
                                                </button>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* MX Records */}
                                {result.MX && result.MX.length > 0 && (
                                  <div className="space-y-3">
                                    <h4 className="font-semibold text-slate-900">MX Records</h4>
                                    <div className="space-y-2">
                                      {result.MX.map((record, i) => (
                                        <div key={i} className="bg-slate-50 p-3 rounded-lg">
                                          <div className="flex items-center justify-between gap-2">
                                            <Mail className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                                            <code className="text-sm font-mono text-slate-800 flex-1">{record}</code>
                                            <button
                                              onClick={() => copyToClipboard(record, `mx-${i}`)}
                                              className="ml-2 p-1 text-slate-400 hover:text-slate-600 transition-colors"
                                              title="Copy to clipboard"
                                            >
                                              {copiedItems[`mx-${i}`] ? (
                                                <Check className="w-4 h-4 text-green-600" />
                                              ) : (
                                                <Copy className="w-4 h-4" />
                                              )}
                                            </button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Name Servers */}
                                {result.nameservers && result.nameservers.length > 0 && (
                                  <div className="space-y-3">
                                    <h4 className="font-semibold text-slate-900">Name Servers</h4>
                                    <div className="space-y-2">
                                      {result.nameservers.map((ns, i) => (
                                        <div key={i} className="bg-slate-50 p-3 rounded-lg">
                                          <div className="flex items-center justify-between gap-2">
                                            <Cloud className="w-4 h-4 text-purple-500 flex-shrink-0" />
                                            <code className="text-sm font-mono text-slate-800 flex-1">{ns}</code>
                                            <button
                                              onClick={() => copyToClipboard(ns, `ns-${i}`)}
                                              className="ml-2 p-1 text-slate-400 hover:text-slate-600 transition-colors"
                                              title="Copy to clipboard"
                                            >
                                              {copiedItems[`ns-${i}`] ? (
                                                <Check className="w-4 h-4 text-green-600" />
                                              ) : (
                                                <Copy className="w-4 h-4" />
                                              )}
                                            </button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>

                          {/* Email Security Section */}
                          <Card className="border-slate-200 shadow-sm">
                            <CardHeader>
                              <div className="flex items-center gap-3">
                                <Mail className="w-5 h-5 text-slate-600" />
                                <CardTitle className="text-lg">Email Security</CardTitle>
                              </div>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-6">
                                {result.SPF && result.SPF.length > 0 && (
                                  <div className="space-y-3">
                                    <h4 className="font-semibold text-slate-900">SPF Records</h4>
                                    <div className="space-y-2">
                                      {result.SPF.map((record, i) => (
                                        <div key={i} className="bg-slate-50 p-3 rounded-lg">
                                          <div className="flex items-start justify-between gap-2">
                                            <Shield className="w-4 h-4 text-orange-500 flex-shrink-0" />
                                            <code className="text-xs font-mono text-slate-800 break-all flex-1">
                                              {record}
                                            </code>
                                            <button
                                              onClick={() => copyToClipboard(record, `spf-${i}`)}
                                              className="flex-shrink-0 p-1 text-slate-400 hover:text-slate-600 transition-colors"
                                              title="Copy to clipboard"
                                            >
                                              {copiedItems[`spf-${i}`] ? (
                                                <Check className="w-4 h-4 text-green-600" />
                                              ) : (
                                                <Copy className="w-4 h-4" />
                                              )}
                                            </button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {result.DKIM && result.DKIM.length > 0 && (
                                  <div className="space-y-3">
                                    <h4 className="font-semibold text-slate-900">DKIM Records</h4>
                                    <div className="space-y-2">
                                      {result.DKIM.map((record, i) => (
                                        <div key={i} className="bg-slate-50 p-3 rounded-lg">
                                          <div className="flex items-start justify-between gap-2">
                                            <Shield className="w-4 h-4 text-cyan-500 flex-shrink-0" />
                                            <code className="text-xs font-mono text-slate-800 break-all flex-1">
                                              {record}
                                            </code>
                                            <button
                                              onClick={() => copyToClipboard(record, `dkim-${i}`)}
                                              className="flex-shrink-0 p-1 text-slate-400 hover:text-slate-600 transition-colors"
                                              title="Copy to clipboard"
                                            >
                                              {copiedItems[`dkim-${i}`] ? (
                                                <Check className="w-4 h-4 text-green-600" />
                                              ) : (
                                                <Copy className="w-4 h-4" />
                                              )}
                                            </button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {result.DMARC && result.DMARC.length > 0 && (
                                  <div className="space-y-3">
                                    <h4 className="font-semibold text-slate-900">DMARC Records</h4>
                                    <div className="space-y-2">
                                      {result.DMARC.map((record, i) => (
                                        <div key={i} className="bg-slate-50 p-3 rounded-lg">
                                          <div className="flex items-start justify-between gap-2">
                                            <Shield className="w-4 h-4 text-pink-500 flex-shrink-0" />
                                            <code className="text-xs font-mono text-slate-800 break-all flex-1">
                                              {record}
                                            </code>
                                            <button
                                              onClick={() => copyToClipboard(record, `dmarc-${i}`)}
                                              className="flex-shrink-0 p-1 text-slate-400 hover:text-slate-600 transition-colors"
                                              title="Copy to clipboard"
                                            >
                                              {copiedItems[`dmarc-${i}`] ? (
                                                <Check className="w-4 h-4 text-green-600" />
                                              ) : (
                                                <Copy className="w-4 h-4" />
                                              )}
                                            </button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {(!result.SPF || result.SPF.length === 0) &&
                                  (!result.DKIM || result.DKIM.length === 0) &&
                                  (!result.DMARC || result.DMARC.length === 0) && (
                                    <div className="flex items-center gap-3 p-4 rounded-lg border border-slate-200 bg-slate-50">
                                      <AlertCircle className="w-4 h-4 text-slate-500" />
                                      <span className="text-slate-600">No email security records found</span>
                                    </div>
                                  )}
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}
