import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { envoyerPriseDeContact } from '@/lib/leads/mails'
import { notifier, nomClient, eurosCourt } from '@/lib/notifier'

export const dynamic = 'force-dynamic'

// Bouton « Mail » de l'onglet Leads : envoie (ou renvoie) tout de suite le mail de prise de contact
export async function POST(req: NextRequest) {
  const { id, source } = await req.json().catch(() => ({}))
  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })

  try {
    if (source === 'cahier_des_charges') {
      const { data: c } = await supabaseAdmin.from('cahier_des_charges')
        .select('id, nom_contact, email, nom_domaine, pack_choisi').eq('id', id).single()
      if (!c) return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 })
      await envoyerPriseDeContact({ nom: c.nom_contact, email: c.email, domaine: c.nom_domaine, pack_demande: c.pack_choisi })
      await supabaseAdmin.from('cahier_des_charges').update({ traite: true }).eq('id', id)
      await notifier({ titre: `Mail de prise de contact envoyé — ${c.nom_domaine || c.nom_contact}`, niveau: 'info', url: 'https://admin.la-gabare.fr/leads' })
      return NextResponse.json({ ok: true, email: c.email })
    }

    const { data: l } = await supabaseAdmin.from('leads')
      .select('id, nom, email, domaine, pack_demande, statut').eq('id', id).single()
    if (!l) return NextResponse.json({ error: 'Lead introuvable' }, { status: 404 })
    await envoyerPriseDeContact({ ...l, lead_id: l.id })
    // On ne fait pas reculer un lead déjà plus avancé (RDV pris, formulaire complété…)
    const statut = ['reception', 'mail_envoye', 'relance'].includes(l.statut || 'reception') ? 'mail_envoye' : l.statut
    await supabaseAdmin.from('leads').update({ statut, mail_envoye_at: new Date().toISOString() }).eq('id', id)
    await notifier({ titre: `Mail de prise de contact envoyé — ${l.domaine || l.nom}`, niveau: 'info', url: 'https://admin.la-gabare.fr/leads' })
    return NextResponse.json({ ok: true, email: l.email })
  } catch (e) {
    console.error('envoyer-mail', e)
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Envoi impossible' }, { status: 500 })
  }
}
