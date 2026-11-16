import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { VUES, TAILLE_MAX, MARQUE_PDF, estJpeg, deposerApercus, supprimerApercus, urlApercu, adresseDepotPdf, pdfExiste, type Vue } from '@/lib/maquettes-prospects'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

// Reçoit les captures de la maquette d'un prospect préparées par Harness Maxxing (jeton ADMIN_WRITE_TOKEN).
function jetonValide(req: NextRequest) {
  const attendu = process.env.ADMIN_WRITE_TOKEN
  const recu = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
  if (!attendu || attendu.length < 24 || !recu) return false
  const h = (x: string) => crypto.createHash('sha256').update(x).digest()
  return crypto.timingSafeEqual(h(recu), h(attendu))
}

export async function POST(req: NextRequest) {
  if (!jetonValide(req)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const b = await req.json().catch(() => ({}))
  const slug = typeof b.slug === 'string' ? b.slug : ''
  if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) return NextResponse.json({ error: 'slug invalide' }, { status: 400 })
  // PDF de la maquette : étape 1 = adresse de dépôt signée, étape 2 (confirmer) = vérifier le fichier et le signaler dans la fiche.
  if (b.pdf === 'adresse' || b.pdf === 'confirmer') {
    const { data: q } = await supabaseAdmin.from('prospects_hm').select('id').eq('slug', slug).maybeSingle()
    if (!q) return NextResponse.json({ error: 'prospect inconnu : le déposer d\'abord' }, { status: 404 })
    if (b.pdf === 'adresse') {
      const adresse = await adresseDepotPdf(slug)
      return adresse ? NextResponse.json({ ok: true, slug, adresse }) : NextResponse.json({ error: 'Adresse de dépôt impossible' }, { status: 500 })
    }
    if (!(await pdfExiste(slug))) return NextResponse.json({ error: 'maquette.pdf absente du stockage' }, { status: 400 })
    await supabaseAdmin.from('prospects_hm').update({ maquette_url: urlApercu(slug) + MARQUE_PDF, updated_at: new Date().toISOString() }).eq('id', q.id)
    await supabaseAdmin.from('evenements').insert({ prospect_id: q.id, type: 'prospect', titre: 'PDF de la maquette de la maquette déposée par Harness Maxxing' })
    return NextResponse.json({ ok: true, slug })
  }
  const images: Partial<Record<Vue, Buffer>> = {}
  for (const vue of VUES) {
    if (typeof b[vue] !== 'string') continue
    const img = Buffer.from(b[vue], 'base64')
    if (!estJpeg(img) || img.length > TAILLE_MAX) return NextResponse.json({ error: `${vue} : JPEG de 1,5 Mo maximum attendu` }, { status: 400 })
    images[vue] = img
  }
  if (!images.bureau) return NextResponse.json({ error: 'capture « bureau » obligatoire' }, { status: 400 })
  const { data: p } = await supabaseAdmin.from('prospects_hm').select('id').eq('slug', slug).maybeSingle()
  if (!p) return NextResponse.json({ error: 'prospect inconnu : le déposer d\'abord' }, { status: 404 })
  if (!(await deposerApercus(slug, images))) return NextResponse.json({ error: 'Enregistrement impossible' }, { status: 500 })
  await supabaseAdmin.from('prospects_hm').update({ maquette_url: urlApercu(slug) + ((await pdfExiste(slug)) ? MARQUE_PDF : ''), updated_at: new Date().toISOString() }).eq('id', p.id)
  await supabaseAdmin.from('evenements').insert({ prospect_id: p.id, type: 'prospect', titre: 'Maquette déposée par Harness Maxxing' })
  return NextResponse.json({ ok: true, slug })
}

// Retire les captures d'un prospect (la maquette est à refaire ou abandonnée).
export async function DELETE(req: NextRequest) {
  if (!jetonValide(req)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const slug = req.nextUrl.searchParams.get('slug') || ''
  if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) return NextResponse.json({ error: 'slug invalide' }, { status: 400 })
  const { data: p } = await supabaseAdmin.from('prospects_hm').select('id').eq('slug', slug).maybeSingle()
  await supprimerApercus(slug)
  if (p) {
    await supabaseAdmin.from('prospects_hm').update({ maquette_url: null, updated_at: new Date().toISOString() }).eq('id', p.id)
    await supabaseAdmin.from('evenements').insert({ prospect_id: p.id, type: 'prospect', titre: 'Maquette retirée' })
  }
  return NextResponse.json({ ok: true, slug })
}
