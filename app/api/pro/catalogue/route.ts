import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { withCors, corsPreflight } from '@/lib/cors'
import { proDepuisRequete } from '@/lib/pro/core'

export const dynamic = 'force-dynamic'

export async function OPTIONS() {
  return corsPreflight()
}

// Tarifs pros et fiches techniques du domaine, pour un pro authentifié par son lien
export async function GET(req: NextRequest) {
  const a = await proDepuisRequete(req)
  if ('erreur' in a) return withCors(NextResponse.json({ error: a.erreur }, { status: a.status }))

  const { data: client } = await supabaseAdmin.from('clients').select('nom_domaine').eq('id', a.pro.client_id).single()
  const { data: produits } = await supabaseAdmin.from('produits')
    .select('id, nom, millesime, couleur, appellation, contenance, prix_pro_cents, stock, fiche_technique_url, image_url')
    .eq('client_id', a.pro.client_id).eq('actif', true).not('prix_pro_cents', 'is', null)
    .order('ordre', { ascending: true })

  const res = NextResponse.json({
    domaine: client?.nom_domaine || '',
    pro: { entreprise: a.pro.entreprise, nom: a.pro.nom, email: a.pro.email, acces_expire_at: a.pro.acces_expire_at },
    produits: (produits || []).map((p) => ({ ...p, disponible: p.stock > 0 })),
  })
  res.headers.set('Cache-Control', 'no-store')
  return withCors(res)
}
