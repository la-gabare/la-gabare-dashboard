import { NextRequest, NextResponse } from 'next/server'
import { VUES, filigraner, lireApercu, type Vue } from '@/lib/maquettes-prospects'

export const dynamic = 'force-dynamic'

// Affiche la capture d'une maquette de prospect (protégé par le mot de passe via le middleware).
export async function GET(req: NextRequest, ctx: { params: Promise<{ slug: string; vue: string }> }) {
  const { slug, vue } = await ctx.params
  if (!/^[a-z0-9][a-z0-9-]*$/.test(slug) || !VUES.includes(vue as Vue)) return new NextResponse('Introuvable', { status: 404 })
  const img = await lireApercu(slug, vue as Vue)
  if (!img) return new NextResponse('Introuvable', { status: 404 })
  const sortie = req.nextUrl.searchParams.get('filigrane') === '1' ? await filigraner(img) : img
  return new NextResponse(new Uint8Array(sortie), { headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, max-age=300' } })
}
