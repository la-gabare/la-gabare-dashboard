import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  const { data: site, error } = await supabaseAdmin
    .from('sites_generes')
    .select('id, client_id, cuvees')
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  const { data: client } = await supabaseAdmin
    .from('clients')
    .select('nom_domaine, region, appellation, cepages')
    .eq('id', site.client_id)
    .single()

  const cuvees = (site.cuvees || []) as Array<{ nom: string; description: string; photo_url: string }>

  const lignes = [
    'Tu crées une boutique WooCommerce pour un domaine viticole.',
    '',
    '=== INFORMATIONS DU DOMAINE ===',
    `Nom : ${client?.nom_domaine || 'Domaine'}`,
    `Appellation : ${client?.appellation || ''}`,
    `Région : ${client?.region || ''}`,
    `Cépages : ${client?.cepages || ''}`,
    '',
    '=== CUVÉES À CRÉER EN TANT QUE PRODUITS WOOCOMMERCE ===',
  ]

  if (cuvees.length === 0) {
    lignes.push('Aucune cuvée fournie. Crée 3-5 produits typiques pour ce domaine.')
  } else {
    cuvees.forEach((c, i) => {
      lignes.push(`${i + 1}. ${c.nom || `Cuvée ${i + 1}`}`)
      if (c.description) lignes.push(`   Description : ${c.description}`)
      if (c.photo_url) lignes.push(`   Photo : ${c.photo_url}`)
      lignes.push('')
    })
  }

  lignes.push(
    '=== STRUCTURE WOOCOMMERCE À CRÉER ===',
    '',
    'Pour chaque cuvée :',
    '1. Nom du produit : exactement tel que fourni',
    '2. Prix : laisse vide (à remplir manuellement)',
    '3. Description courte : 50-100 mots, style gustatif et accords mets-vins',
    '4. Description longue : la description complète fournie si disponible',
    '5. Image : si une photo est fournie, la mettre en avant',
    '6. Catégories : Vins Rouges / Vins Blancs / Rosés (au choix selon le type)',
    '7. Étiquettes : cépage principal, millésime si connu, terroir',
    '8. Stock : mettre à jour après chaque vente',
    '9. Attributs : créer des variantes si plusieurs millésimes/formats',
    '',
    '=== CONFIGURATION BOUTIQUE ===',
    `Page d'accueil boutique : "Nos cuvées à la vente"`,
    `Logo : utiliser le même logo que le site vitrine`,
    `Couleurs : reprendre la palette du site (accent/or)`,
    `Paiement : intégrer avec PayPal et/ou Stripe`,
    `Livraison : zones géographiques et tarifs à définir`,
    '',
    `Produis les fiches produit WooCommerce pour chaque cuvée, prêtes à copier-coller.`,
  ]

  return NextResponse.json({
    prompt: lignes.join('\n'),
    cuvees_count: cuvees.length,
    domaine: client?.nom_domaine || 'Domaine',
  })
}
