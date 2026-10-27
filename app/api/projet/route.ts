import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { declencherVersement, mailMaquetteSoumise, mailMiseEnLigne } from '@/lib/paiements/projet'
import { demarrerAccompagnementOffert } from '@/lib/paiements/accompagnement-offert'
import { notifier, nomClient, eurosCourt } from '@/lib/notifier'

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
      // Mail d'abord : s'il échoue, la maquette n'est pas marquée « à valider » et l'agence le voit tout de suite
      await mailMaquetteSoumise(c, url)
      await supabaseAdmin.from('clients').update({
        maquette_url: url, maquette_statut: 'a_valider', maquette_soumise_at: new Date().toISOString(),
      }).eq('id', c.id)
      await notifier({ titre: `Maquette envoyée au client — ${await nomClient(c.id)}`, corps: url, niveau: 'info', url: `https://admin.la-gabare.fr/clients/${c.id}` })
      return NextResponse.json({ ok: true })
    }

    if (body.action === 'contenu_valider') {
      // L'agence valide (ou remet « à fournir ») un élément de la checklist
      const etats = { ...(c.contenus || {}) }
      const cle = String(body.cle || '')
      if (body.valide) etats[cle] = { ...(etats[cle] || {}), statut: 'valide', valide_at: new Date().toISOString() }
      else delete etats[cle]
      await supabaseAdmin.from('clients').update({ contenus: etats }).eq('id', c.id)
      return NextResponse.json({ ok: true })
    }

    if (body.action === 'valider_maquette') {
      // Validation reçue par téléphone ou par mail
      await supabaseAdmin.from('clients').update({ maquette_statut: 'validee', maquette_validee_at: new Date().toISOString() }).eq('id', c.id)
      const v = await declencherVersement(c.id, 'maquette')
      await notifier({ titre: `Maquette validée (côté admin) — ${await nomClient(c.id)}`, niveau: 'success', url: `https://admin.la-gabare.fr/clients/${c.id}` })
      return NextResponse.json({ ok: true, versement_envoye: Boolean(v) })
    }

    if (body.action === 'mise_en_ligne') {
      if (!urlValide) return NextResponse.json({ error: 'Adresse du site invalide (https://…)' }, { status: 400 })
      const domaine = new URL(url).hostname.replace(/^www\./, '')
      const { error: majErreur } = await supabaseAdmin.from('clients').update({
        site_url: url, domaine: c.domaine || domaine, mis_en_ligne_at: new Date().toISOString(),
      }).eq('id', c.id)
      if (majErreur) {
        const doublon = majErreur.code === '23505'
        return NextResponse.json({
          error: doublon ? `L'adresse ${domaine} est déjà utilisée par un autre client.` : majErreur.message,
        }, { status: doublon ? 409 : 500 })
      }
      const v = await declencherVersement(c.id, 'mise_en_ligne')
      await mailMiseEnLigne(c, url)
      await notifier({ titre: `Site mis en ligne — ${await nomClient(c.id)}`, corps: url, niveau: 'success', url: `https://admin.la-gabare.fr/clients/${c.id}`, id: `en-ligne-${c.id}` })
      // Mois d'accompagnement inclus dans le pack : démarrage + enregistrement du moyen de paiement
      let offert = null
      try { offert = await demarrerAccompagnementOffert(c.id) } catch (e) { console.error('accompagnement offert', e) }
      return NextResponse.json({ ok: true, versement_envoye: Boolean(v), accompagnement_offert: offert?.fin_offert || null })
    }

    return NextResponse.json({ error: 'Action inconnue' }, { status: 400 })
  } catch (err) {
    console.error('projet', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erreur' }, { status: 500 })
  }
}
