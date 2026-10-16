import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { withCors, corsPreflight } from '@/lib/cors'
import { sendMail } from '@/lib/mailer'
import { BoutiqueConfig } from '@/lib/boutique/core'
import { texte, tropDeRequetes, ipDe } from '@/lib/leads/public'
import { proDepuisRequete } from '@/lib/pro/core'
import { mailDemandePro } from '@/lib/pro/emails'

export const dynamic = 'force-dynamic'

export async function OPTIONS() {
  return corsPreflight()
}

function json(data: unknown, status = 200) {
  return withCors(NextResponse.json(data, { status }))
}

// Demande de commande ou d'échantillons d'un pro (sans paiement en ligne : le domaine facture)
export async function POST(req: NextRequest) {
  const a = await proDepuisRequete(req)
  if ('erreur' in a) return json({ error: a.erreur }, a.status)
  if (tropDeRequetes(ipDe(req), 10)) return json({ error: 'Trop de demandes, réessayez plus tard.' }, 429)

  const body = await req.json().catch(() => ({} as Record<string, any>))
  const type = body.type === 'echantillons' ? 'echantillons' : 'commande'
  const items: { id: number; quantite: number }[] = Array.isArray(body.items) ? body.items.slice(0, 40) : []

  const quantites = new Map<number, number>()
  for (const it of items) {
    const id = Number(it?.id), q = Number(it?.quantite)
    if (!Number.isInteger(id) || !Number.isInteger(q) || q < 1 || q > 5000) continue
    quantites.set(id, (quantites.get(id) || 0) + q)
  }
  if (!quantites.size) return json({ error: 'Indiquez au moins une cuvée et une quantité.' }, 400)

  const { data: produits } = await supabaseAdmin.from('produits')
    .select('id, nom, millesime, prix_pro_cents').eq('client_id', a.pro.client_id).eq('actif', true)
    .in('id', Array.from(quantites.keys()))
  const lignes = (produits || []).map((p) => ({
    produit_id: p.id, nom: p.nom, millesime: p.millesime,
    prix_pro_cents: type === 'commande' ? p.prix_pro_cents : null,
    quantite: type === 'echantillons' ? Math.min(quantites.get(p.id) || 1, 6) : quantites.get(p.id) || 0,
  }))
  if (!lignes.length) return json({ error: 'Ces cuvées ne sont plus disponibles.' }, 409)
  const total = lignes.reduce((s, l) => s + (l.prix_pro_cents || 0) * l.quantite, 0)
  const message = texte(body.message, 2000)

  const { data: demande, error } = await supabaseAdmin.from('pro_demandes').insert({
    client_id: a.pro.client_id, pro_id: a.pro.id, type, lignes, total_ht_cents: total, message,
  }).select().single()
  if (error || !demande) {
    console.error('pro/demande', error)
    return json({ error: 'Envoi impossible pour le moment.' }, 500)
  }

  const { data: client } = await supabaseAdmin.from('clients')
    .select('nom_domaine, email_contact, boutique_config').eq('id', a.pro.client_id).single()
  const notif = ((client?.boutique_config || {}) as BoutiqueConfig).email_notif || client?.email_contact
  if (notif) {
    try {
      await sendMail(notif, `${type === 'commande' ? 'Commande pro' : 'Demande d\'échantillons'} — ${a.pro.entreprise}`,
        mailDemandePro(client!.nom_domaine, a.pro, { type, lignes, total_ht_cents: total, message }),
        { fromName: 'La Gabare — Espace pro', replyTo: a.pro.email })
    } catch (e) { console.error('pro/demande mail', e) }
  }
  return json({ ok: true, id: demande.id })
}
