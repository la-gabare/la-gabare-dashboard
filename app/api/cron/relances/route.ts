import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendMail } from '@/lib/mailer'
import { envoyerEcheance, euros, Echeance } from '@/lib/paiements/echeancier'
import { relancerDevis, relancerLeads, suivreMoisOfferts } from '@/lib/relances-auto'
import { rattraperRapports } from '@/lib/audit-ia'
import { relancerContenus } from '@/lib/contenus'
import { envoyerRapportsMensuels } from '@/lib/rapport-mensuel'
import { proposerOffres } from '@/lib/offres'
import { envoyerMailsDuMois, envoyerMailsHebdoEnAttente } from '@/lib/mails-contenu'
import { notifier } from '@/lib/notifier'
import { executerTaches, prendreVerrou, libererVerrou } from '@/lib/cron-relances'

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // inclut un éventuel rapport d'audit en rattrapage

const VERROU = 'relances'
const BUDGET_MS = 50_000     // marge sous maxDuration : les tâches non commencées sont reportées au lendemain
const JOUR = 24 * 60 * 60 * 1000
const DELAI_JOURS = 5        // première relance 5 jours après l'envoi, puis tous les 5 jours
const MAX_RELANCES = 3       // ensuite, l'agence est prévenue pour reprendre la main
const AGENCE = process.env.AGENCE_NOTIF_EMAIL || process.env.SMTP_USER || ''

// Relances automatiques des versements non réglés — appelé chaque jour par Vercel Cron (vercel.json)
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  if (!(await prendreVerrou(VERROU, 5 * 60))) return NextResponse.json({ ignore: 'déjà en cours' })
  const debut = Date.now()
  const { data } = await supabaseAdmin.from('echeances')
    .select('*').in('statut', ['envoye', 'virement_en_attente']).not('envoye_at', 'is', null)
  const maintenant = Date.now()
  const bilan = { relances: 0, alertes: 0, erreurs: 0 }

  for (const e of (data || []) as Echeance[]) {
    const depuis = new Date(e.derniere_relance_at || e.envoye_at!).getTime()
    if (maintenant - depuis < DELAI_JOURS * JOUR) continue
    try {
      if (e.relances < MAX_RELANCES) {
        await envoyerEcheance(e, true)
        await supabaseAdmin.from('echeances')
          .update({ relances: e.relances + 1, derniere_relance_at: new Date().toISOString() }).eq('id', e.id)
        bilan.relances++
      } else if (e.relances === MAX_RELANCES && AGENCE) {
        const { data: c } = await supabaseAdmin.from('clients').select('nom_domaine, email_contact').eq('id', e.client_id).single()
        await sendMail(AGENCE, `Impayé — ${c?.nom_domaine || 'client ' + e.client_id} · ${euros(e.montant_cents)}`,
          `<p style="font-family:Arial,sans-serif;font-size:14px;">« ${e.libelle} » (${euros(e.montant_cents)}) n'est toujours pas réglé après ${MAX_RELANCES} relances automatiques.
           À reprendre à la main : ${c?.email_contact || ''}.</p>
           <p style="font-family:Arial,sans-serif;font-size:14px;"><a href="https://admin.la-gabare.fr/clients/${e.client_id}">Ouvrir la fiche client</a></p>`,
          { fromName: 'La Gabare — Paiements' })
        await supabaseAdmin.from('echeances')
          .update({ relances: e.relances + 1, derniere_relance_at: new Date().toISOString() }).eq('id', e.id)
        bilan.alertes++
      }
    } catch (err) {
      console.error('relance', e.id, err)
      bilan.erreurs++
    }
  }
  // Devis non acceptés, mois offerts, contenus, rapports, offres, audits, mails : chaque tâche est isolée
  const { resultats, echecs, reportees } = await executerTaches([
    { nom: 'devis', run: relancerDevis },
    { nom: 'leads', run: relancerLeads },
    { nom: 'mois_offerts', run: suivreMoisOfferts },
    { nom: 'contenus', run: relancerContenus },
    { nom: 'rapports', run: envoyerRapportsMensuels },
    { nom: 'offres', run: proposerOffres },
    { nom: 'audits', run: rattraperRapports },
    { nom: 'mails_contenu', run: envoyerMailsDuMois },
    { nom: 'mails_hebdo', run: envoyerMailsHebdoEnAttente },
  ], BUDGET_MS, debut)
  if (bilan.relances || bilan.alertes) {
    await notifier({
      titre: `Versements : ${bilan.relances} relance(s), ${bilan.alertes} impayé(s) à reprendre`,
      niveau: bilan.alertes ? 'warning' : 'info', url: 'https://admin.la-gabare.fr/clients',
      id: `relances-${new Date().toISOString().slice(0, 10)}`,
    })
  }
  if (echecs.length || reportees.length) {
    await notifier({ titre: `Relances : ${echecs.length} tâche(s) en échec, ${reportees.length} reportée(s)`, corps: [...echecs, ...reportees].join(', '),
      niveau: 'warning', id: `relances-taches-${new Date().toISOString().slice(0, 10)}` })
  }
  await libererVerrou(VERROU)
  return NextResponse.json({ versements: bilan, ...resultats })
}
