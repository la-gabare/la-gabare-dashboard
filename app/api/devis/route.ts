import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { FORMULES } from '@/lib/paiements/echeancier'
import {
  calculer, prochainNumero, nouveauToken, envoyerDevis, lienDevis, TVA_PCT, CATALOGUE, LigneDevis, Devis,
} from '@/lib/paiements/devis'
import { notifier, nomClient, eurosCourt } from '@/lib/notifier'

export const dynamic = 'force-dynamic'

// Devis d'un client (dashboard, protégé par l'authentification de l'admin)
export async function GET(req: NextRequest) {
  const clientId = Number(req.nextUrl.searchParams.get('client_id'))
  if (!clientId) return NextResponse.json({ error: 'client_id requis' }, { status: 400 })
  const { data, error } = await supabaseAdmin.from('devis').select('*').eq('client_id', clientId).order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({
    devis: (data || []).map((d) => ({ ...d, lien: lienDevis(d.token) })),
    tva_pct: TVA_PCT,
    catalogue: CATALOGUE,
  })
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const action = String(body.action || '')

  try {
    if (action === 'creer') {
      const clientId = Number(body.client_id)
      const formule = String(body.formule || '3x')
      const remise = Math.min(Math.max(Number(body.remise_pct) || 0, 0), 30)
      const lignes: LigneDevis[] = (Array.isArray(body.lignes) ? body.lignes : [])
        .map((l: Record<string, unknown>) => ({
          libelle: String(l.libelle || '').trim().slice(0, 120),
          detail: String(l.detail || '').trim().slice(0, 300) || undefined,
          montant_ht_cents: Math.round(Number(l.montant_ht) * 100),
        }))
        .filter((l: LigneDevis) => l.libelle && l.montant_ht_cents > 0)
      if (!clientId || !lignes.length || !FORMULES[formule]) {
        return NextResponse.json({ error: 'Client, au moins une ligne et une formule sont requis' }, { status: 400 })
      }
      const { data: cl } = await supabaseAdmin.from('clients').select('email_contact').eq('id', clientId).single()
      if (!cl?.email_contact) return NextResponse.json({ error: "Ce client n'a pas d'adresse e-mail : ajoutez-la sur sa fiche avant d'envoyer un devis." }, { status: 400 })
      const t = calculer(lignes, formule, remise)
      const validite = new Date(Date.now() + (Number(body.validite_jours) || 30) * 24 * 60 * 60 * 1000)
      const { data: d, error } = await supabaseAdmin.from('devis').insert({
        client_id: clientId, numero: await prochainNumero(), lignes, remise_pct: formule === '1x' ? remise : 0,
        total_ht_cents: t.ht, tva_pct: TVA_PCT, total_ttc_cents: t.ttc, formule,
        validite: validite.toISOString().slice(0, 10), token: nouveauToken(), envoye_at: new Date().toISOString(),
      }).select().single()
      if (error || !d) throw new Error(error?.message || 'Création impossible')
      try {
        await envoyerDevis(d as Devis)
      } catch (err) {
        // Mail non parti : on annule le devis pour ne pas laisser de devis fantôme ni de doublon au prochain essai
        await supabaseAdmin.from('devis').update({ statut: 'annule' }).eq('id', d.id)
        throw new Error(`Le mail du devis n'est pas parti, le devis a été annulé. Réessayez. (${err instanceof Error ? err.message : 'erreur'})`)
      }
      await notifier({ titre: `Devis envoyé — ${await nomClient(clientId)}`, corps: `${d.numero} · ${eurosCourt(d.total_ttc_cents)} TTC · ${formule}`, niveau: 'info', url: `https://admin.la-gabare.fr/clients/${clientId}`, id: `devis-${d.id}` })
      return NextResponse.json({ ok: true, lien: lienDevis(d.token) })
    }

    const id = Number(body.devis_id)
    const { data: d } = await supabaseAdmin.from('devis').select('*').eq('id', id).single()
    if (!d) return NextResponse.json({ error: 'Devis introuvable' }, { status: 404 })

    if (action === 'renvoyer') {
      if (d.statut !== 'envoye') return NextResponse.json({ error: 'Ce devis n\'est plus en attente' }, { status: 400 })
      await envoyerDevis(d as Devis)
      await notifier({ titre: `Devis renvoyé — ${await nomClient(d.client_id)}`, corps: d.numero, niveau: 'info', url: `https://admin.la-gabare.fr/clients/${d.client_id}` })
      return NextResponse.json({ ok: true })
    }
    if (action === 'annuler') {
      if (d.statut === 'accepte') return NextResponse.json({ error: 'Un devis accepté ne peut pas être annulé' }, { status: 400 })
      await supabaseAdmin.from('devis').update({ statut: 'annule' }).eq('id', id)
      await notifier({ titre: `Devis annulé — ${await nomClient(d.client_id)}`, corps: d.numero, niveau: 'warning', url: `https://admin.la-gabare.fr/clients/${d.client_id}` })
      return NextResponse.json({ ok: true })
    }
    return NextResponse.json({ error: 'Action inconnue' }, { status: 400 })
  } catch (err) {
    console.error('devis', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erreur' }, { status: 500 })
  }
}
