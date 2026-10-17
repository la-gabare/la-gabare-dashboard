import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { declencherVersement, mailMaquetteSoumise, mailMiseEnLigne } from '@/lib/paiements/projet'

export const dynamic = 'force-dynamic'

// Étapes du projet de site, côté agence (dashboard protégé) : soumettre la maquette, déclarer la mise en ligne
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const clientId = Number(body.client_id)
  const { data: c } = await supabaseAdmin.from('clients').select('*').eq('id', clientId).single()
  if (!c) return NextResponse.json({ error: 'Client introuvable' }, { status: 404 })

  const url = String(body.url || '').trim()
  const urlValide = /^https?:\/\/[^\s]+$/.test(url)

  try {
    if (body.action === 'soumettre_maquette') {
      if (!urlValide) return NextResponse.json({ error: 'Adresse de la maquette invalide (https://…)' }, { status: 400 })
      await supabaseAdmin.from('clients').update({
        maquette_url: url, maquette_statut: 'a_valider', maquette_soumise_at: new Date().toISOString(),
      }).eq('id', c.id)
      await mailMaquetteSoumise(c, url)
      return NextResponse.json({ ok: true })
    }

    if (body.action === 'valider_maquette') {
      // Validation reçue par téléphone ou par mail
      await supabaseAdmin.from('clients').update({ maquette_statut: 'validee', maquette_validee_at: new Date().toISOString() }).eq('id', c.id)
      const v = await declencherVersement(c.id, 'maquette')
      return NextResponse.json({ ok: true, versement_envoye: Boolean(v) })
    }

    if (body.action === 'mise_en_ligne') {
      if (!urlValide) return NextResponse.json({ error: 'Adresse du site invalide (https://…)' }, { status: 400 })
      const domaine = new URL(url).hostname.replace(/^www\./, '')
      await supabaseAdmin.from('clients').update({
        site_url: url, domaine: c.domaine || domaine, mis_en_ligne_at: new Date().toISOString(),
      }).eq('id', c.id)
      const v = await declencherVersement(c.id, 'mise_en_ligne')
      await mailMiseEnLigne(c, url)
      return NextResponse.json({ ok: true, versement_envoye: Boolean(v) })
    }

    return NextResponse.json({ error: 'Action inconnue' }, { status: 400 })
  } catch (err) {
    console.error('projet', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erreur' }, { status: 500 })
  }
}
