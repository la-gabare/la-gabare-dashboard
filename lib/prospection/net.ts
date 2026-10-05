import 'server-only'
import dns from 'node:dns/promises'
import net from 'node:net'

export const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36 GabareProspect/1.0'

export class NetError extends Error {
  code: string
  constructor(code: string, message?: string) {
    super(message || code)
    this.code = code
  }
}

export interface FetchResult {
  status: number
  text: string
  headers: Record<string, string>
  url: string
  elapsed: number
  size: number
}

function isPrivateV4(ip: string): boolean {
  const [a, b] = ip.split('.').map(Number)
  return (
    a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224
  )
}

export function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) return isPrivateV4(ip)
  const v = ip.toLowerCase()
  if (v === '::1' || v === '::') return true
  if (v.startsWith('::ffff:')) return isPrivateV4(v.slice(7))
  return v.startsWith('fc') || v.startsWith('fd') || v.startsWith('fe8') || v.startsWith('fe9') || v.startsWith('fea') || v.startsWith('feb')
}

/** Refuse tout nom d'hôte qui résout vers une adresse interne (SSRF). */
export async function assertPublicHost(hostname: string): Promise<void> {
  if (net.isIP(hostname)) {
    if (isPrivateIp(hostname)) throw new NetError('PRIVATE', 'Adresse interne refusée')
    return
  }
  let addrs: { address: string }[]
  try {
    addrs = await dns.lookup(hostname, { all: true })
  } catch {
    throw new NetError('ENOTFOUND', 'Domaine introuvable')
  }
  if (!addrs.length || addrs.some((a) => isPrivateIp(a.address))) throw new NetError('PRIVATE', 'Adresse interne refusée')
}

const CERT_CODES = new Set([
  'CERT_HAS_EXPIRED', 'DEPTH_ZERO_SELF_SIGNED_CERT', 'UNABLE_TO_VERIFY_LEAF_SIGNATURE', 'ERR_TLS_CERT_ALTNAME_INVALID',
  'SELF_SIGNED_CERT_IN_CHAIN', 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY', 'CERT_NOT_YET_VALID', 'ERR_SSL_WRONG_VERSION_NUMBER',
])

function classify(e: any): NetError {
  if (e instanceof NetError) return e
  const code: string = e?.cause?.code || e?.code || ''
  if (CERT_CODES.has(code)) return new NetError('CERT', code)
  if (e?.name === 'TimeoutError' || e?.name === 'AbortError') return new NetError('TIMEOUT', 'Délai dépassé')
  return new NetError(code || 'NETWORK', e?.message || 'Erreur réseau')
}

async function readBody(res: Response, maxBytes: number): Promise<{ buf: Uint8Array; size: number }> {
  if (!res.body) return { buf: new Uint8Array(), size: 0 }
  const reader = res.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  while (size < maxBytes) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    size += value.length
  }
  try { await reader.cancel() } catch { /* ignore */ }
  const buf = new Uint8Array(Math.min(size, maxBytes))
  let o = 0
  for (const c of chunks) {
    const take = Math.min(c.length, buf.length - o)
    buf.set(c.subarray(0, take), o)
    o += take
    if (o >= buf.length) break
  }
  return { buf, size }
}

function decode(buf: Uint8Array, contentType: string): string {
  let charset = /charset=["']?([\w-]+)/i.exec(contentType)?.[1]
  if (!charset) {
    const head = new TextDecoder('latin1').decode(buf.subarray(0, 4000))
    charset = /charset=["']?([\w-]+)/i.exec(head)?.[1] || 'utf-8'
  }
  try {
    return new TextDecoder(charset).decode(buf)
  } catch {
    return new TextDecoder('utf-8').decode(buf)
  }
}

/** GET sécurisé : HTTP(S) uniquement, hôtes publics uniquement (à chaque redirection), délai et taille bornés. */
export async function safeFetch(
  url: string,
  opts: { timeoutMs?: number; maxBytes?: number; accept?: string; method?: 'GET' | 'POST'; body?: string; headers?: Record<string, string> } = {},
): Promise<FetchResult> {
  const timeoutMs = opts.timeoutMs ?? 10000
  const maxBytes = opts.maxBytes ?? 700_000
  const t0 = Date.now()
  let current = url
  for (let hop = 0; hop < 6; hop++) {
    let u: URL
    try { u = new URL(current) } catch { throw new NetError('BADURL', 'URL invalide') }
    if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new NetError('BADURL', 'Protocole refusé')
    if (u.port && u.port !== '80' && u.port !== '443') throw new NetError('BADURL', 'Port refusé')
    await assertPublicHost(u.hostname)
    let res: Response
    try {
      res = await fetch(u.toString(), {
        method: opts.method || 'GET',
        body: opts.body,
        redirect: 'manual',
        signal: AbortSignal.timeout(timeoutMs),
        headers: {
          'User-Agent': UA,
          Accept: opts.accept || 'text/html,application/xhtml+xml,*/*',
          'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.5',
          ...(opts.headers || {}),
        },
      })
    } catch (e) {
      throw classify(e)
    }
    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      current = new URL(res.headers.get('location') as string, u).toString()
      try { await res.body?.cancel() } catch { /* ignore */ }
      continue
    }
    let read: { buf: Uint8Array; size: number }
    try {
      read = await readBody(res, maxBytes)
    } catch (e) {
      throw classify(e)
    }
    const headers: Record<string, string> = {}
    res.headers.forEach((v, k) => { headers[k.toLowerCase()] = v })
    return {
      status: res.status, text: decode(read.buf, headers['content-type'] || ''), headers, url: u.toString(),
      elapsed: (Date.now() - t0) / 1000, size: read.size,
    }
  }
  throw new NetError('REDIRECTS', 'Trop de redirections')
}

export async function safeJson<T = any>(url: string, opts: Parameters<typeof safeFetch>[1] = {}): Promise<T> {
  const r = await safeFetch(url, { accept: 'application/json', maxBytes: 5_000_000, ...opts })
  if (r.status >= 400) throw new NetError(`HTTP_${r.status}`, `HTTP ${r.status}`)
  return JSON.parse(r.text) as T
}

export const stripAcc = (s: string | null | undefined) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
