import "server-only"
import net from "node:net"

export function withTimeout<T>(promise: Promise<T>, ms: number, label = "operation"): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    promise.then(
      (v) => {
        clearTimeout(t)
        resolve(v)
      },
      (e) => {
        clearTimeout(t)
        reject(e)
      },
    )
  })
}

/** Returns false for loopback, private, link-local, CGNAT, multicast and reserved ranges. */
export function isPublicIp(ip: string): boolean {
  const v = net.isIP(ip)
  if (v === 4) {
    const [a, b] = ip.split(".").map(Number)
    if (a === 0 || a === 10 || a === 127 || a >= 224) return false
    if (a === 100 && b >= 64 && b <= 127) return false
    if (a === 169 && b === 254) return false
    if (a === 172 && b >= 16 && b <= 31) return false
    if (a === 192 && b === 168) return false
    if (a === 192 && b === 0) return false
    if (a === 198 && (b === 18 || b === 19)) return false
    return true
  }
  if (v === 6) {
    const x = ip.toLowerCase()
    if (x === "::" || x === "::1") return false
    if (x.startsWith("fc") || x.startsWith("fd")) return false
    if (x.startsWith("fe8") || x.startsWith("fe9") || x.startsWith("fea") || x.startsWith("feb")) return false
    if (x.startsWith("ff")) return false
    const mapped = x.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
    if (mapped) return isPublicIp(mapped[1])
    return true
  }
  return false
}

/** Raw WHOIS query over TCP port 43. */
export function whoisQuery(server: string, query: string, timeoutMs = 8000): Promise<string> {
  return new Promise((resolve, reject) => {
    let buf = ""
    const sock = net.connect(43, server, () => sock.write(`${query}\r\n`))
    sock.setEncoding("utf8")
    sock.setTimeout(timeoutMs, () => {
      sock.destroy()
      reject(new Error(`WHOIS ${server} timed out`))
    })
    sock.on("data", (c) => {
      buf += c
      if (buf.length > 200_000) sock.destroy()
    })
    sock.on("close", () => resolve(buf))
    sock.on("error", reject)
  })
}
