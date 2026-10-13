// Domain input normalization and validation. Safe to import on client and server.

const LABEL = /^(?!-)[a-z0-9-]{1,63}(?<!-)$/
const TLD = /^(xn--[a-z0-9-]{1,59}|[a-z]{2,63})$/

/** Turns "https://www.Example.tn/path" into "example.tn". Returns "" for junk. */
export function normalizeDomain(input: string): string {
  let d = input.trim().toLowerCase()
  d = d.replace(/^[a-z]+:\/\//, "")
  d = d.split(/[/?#]/)[0]
  d = d.replace(/:\d+$/, "")
  d = d.replace(/^\.+|\.+$/g, "")
  d = d.replace(/^www\./, "")
  try {
    // Converts unicode (IDN) labels to punycode.
    if (/[^\x00-\x7f]/.test(d)) d = new URL(`http://${d}`).hostname
  } catch {
    return ""
  }
  return d
}

export function isValidDomain(domain: string): boolean {
  if (!domain || domain.length > 253) return false
  const labels = domain.split(".")
  if (labels.length < 2) return false
  if (!labels.every((l) => LABEL.test(l))) return false
  return TLD.test(labels[labels.length - 1])
}

export function validationMessage(input: string): string | null {
  const d = normalizeDomain(input)
  if (!d) return "Enter a domain name."
  if (!d.includes(".")) return "Include the extension, e.g. example.tn or example.com."
  if (!isValidDomain(d)) return "That doesn't look like a valid domain name."
  return null
}
