import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { withCors, corsPreflight } from '@/lib/cors'
import { clientParDomaine, fraisPort, PORT_DEFAUT, PRODUIT_COLONNES_PUBLIQUES, BoutiqueConfig } from '@/lib/boutique/core'

export const dynamic = 'force-dynamic'

export async function OPTIONS() {
  return corsPreflight()
}

// Catalogue public d'un domaine : prix et stock à jour, lus par js/boutique.js sur le site
export async function GET(req: NextRequest) {
  const domain = req.nextUrl.searchParams.get('domain')
  if (!domain) return withCors(NextResponse.json({ error: 'domain requis' }, { status: 400 }))

  const client = await clientParDomaine(domain)
  if (!client || !client.boutique_active) {
    return withCors(NextResponse.json({ ouverte: false, produits: [] }))
  }

  const { data: produits } = await supabaseAdmin
    .from('produits')
    .select(PRODUIT_COLONNES_PUBLIQUES)
    .eq('client_id', client.id)
    .eq('actif', true)
    .order('ordre', { ascending: true })

  const config = (client.boutique_config || {}) as BoutiqueConfig
  const res = NextResponse.json({
    ouverte: Boolean(client.stripe_account_id),
    produits: produits || [],
    livraison: {
      grille: config.frais_port?.length ? config.frais_port : PORT_DEFAUT,
      franco_bouteilles: config.franco_bouteilles || null,
      retrait_caveau: config.retrait_caveau !== false,
      max_bouteilles: config.max_bouteilles || 36,
      exemple_6: fraisPort(config, 6),
    },
    cgv_url: config.cgv_url || null,
  })
  res.headers.set('Cache-Control', 'public, max-age=30')
  return withCors(res)
}
