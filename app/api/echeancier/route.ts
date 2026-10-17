import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { decouper, envoyerEcheance, marquerPayee, lienPaiement, FORMULES, Echeance } from '@/lib/paiements/echeancier'

export const dynamic = 'force-dynamic'

// Échéancier de paiement du site d'un client (dashboard, protégé par l'authentification de l'admin)
export async function GET(req: NextRequest) {
  const clientId = Number(req.nextUrl.searchParams.get('client_id'))
  if (!clientId) return NextResponse.json({ error: 'client_id requis' }, { status: 400 })
  const { data, error } = await supabaseAdmin.from('echeances').select('*').eq('client_id', clientId).order('ordre')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ echeances: (data || []).map((e) => ({ ...e, lien: lienPaiement(e) })) })
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const action = String(body.action || '')

  try {
    if (action === 'creer') {
      const clientId = Number(body.client_id)
      const totalCents = Math.round(Number(body.total) * 100)
      const formule = String(body.formule || '3x')
      if (!clientId || !(totalCents > 0) || !FORMULES[formule]) {
        return NextResponse.json({ error: 'Client, montant total et formule requis' }, { status: 400 })
      }
      const { data: existantes } = await supabaseAdmin.from('echeances')
        .select('id').eq('client_id', clientId).neq('statut', 'annule').limit(1)
      if (existantes?.length) {
        return NextResponse.json({ error: 'Ce client a déjà un échéancier. Annulez-le avant d\'en créer un autre.' }, { status: 409 })
      }
      const lignes = decouper(totalCents, formule).map((l) => ({ ...l, client_id: clientId }))
      const { data, error } = await supabaseAdmin.from('echeances').insert(lignes).select().order('ordre')
      if (error || !data) throw new Error(error?.message || 'Création impossible')
      // Le premier versement part tout de suite si demandé
      if (body.envoyer_premier) {
        await envoyerEcheance(data[0] as Echeance)
        await supabaseAdmin.from('echeances').update({ statut: 'envoye', envoye_at: new Date().toISOString() }).eq('id', data[0].id)
      }
      return NextResponse.json({ ok: true })
    }

    const id = Number(body.echeance_id)
    const { data: e } = await supabaseAdmin.from('echeances').select('*').eq('id', id).single()
    if (!e) return NextResponse.json({ error: 'Versement introuvable' }, { status: 404 })

    if (action === 'envoyer') {
      if (e.statut === 'paye' || e.statut === 'annule') return NextResponse.json({ error: 'Ce versement est clos' }, { status: 400 })
      const dejaEnvoye = e.statut !== 'a_venir'
      await envoyerEcheance(e as Echeance, dejaEnvoye)
      await supabaseAdmin.from('echeances').update(dejaEnvoye
        ? { relances: e.relances + 1, derniere_relance_at: new Date().toISOString() }
        : { statut: 'envoye', envoye_at: new Date().toISOString() }).eq('id', id)
      return NextResponse.json({ ok: true })
    }

    if (action === 'marquer_paye') {
      // Virement reçu directement sur le compte bancaire, chèque…
      await marquerPayee(id, 'manuel')
      return NextResponse.json({ ok: true })
    }

    if (action === 'annuler') {
      if (e.statut === 'paye') return NextResponse.json({ error: 'Un versement payé ne peut pas être annulé' }, { status: 400 })
      await supabaseAdmin.from('echeances').update({ statut: 'annule' }).eq('id', id)
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Action inconnue' }, { status: 400 })
  } catch (err) {
    console.error('echeancier', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erreur' }, { status: 500 })
  }
}
