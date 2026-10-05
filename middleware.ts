import { NextRequest, NextResponse } from 'next/server'

// Protège UNIQUEMENT le module Prospection (page + API) par authentification HTTP Basic.
// Le reste de l'admin et les API publiques (publish-article, formulaires…) ne sont pas touchés.
export const config = {
  matcher: ['/prospection/:path*', '/api/prospection/:path*'],
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let r = 0
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return r === 0
}

export function middleware(req: NextRequest) {
  const password = process.env.PROSPECTION_PASSWORD
  if (!password) {
    // En développement local, accès libre. En production, le module reste verrouillé tant que le mot de passe n'est pas défini.
    if (process.env.NODE_ENV !== 'production') return NextResponse.next()
    return new NextResponse(
      'Module Prospection verrouillé : définissez la variable PROSPECTION_PASSWORD dans Vercel (Settings > Environment Variables).',
      { status: 503 },
    )
  }
  const user = process.env.PROSPECTION_USER || 'admin'
  const header = req.headers.get('authorization') || ''
  if (header.startsWith('Basic ')) {
    try {
      const [u, ...rest] = atob(header.slice(6)).split(':')
      const p = rest.join(':')
      // l'identifiant est insensible à la casse et aux espaces (« La Gabare » = « lagabare »)
      const norm = (x: string) => x.toLowerCase().replace(/\s+/g, '')
      if (safeEqual(norm(u), norm(user)) && safeEqual(p, password)) return NextResponse.next()
    } catch { /* en-tête invalide */ }
  }
  return new NextResponse('Authentification requise', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="La Gabare - Prospection", charset="UTF-8"' },
  })
}
