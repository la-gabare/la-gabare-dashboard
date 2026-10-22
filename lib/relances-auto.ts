import 'server-only'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { stripe } from '@/lib/stripe'
import { sendMail } from '@/lib/mailer'
import { envoyerDevis, Devis } from '@/lib/paiements/devis'
import { finMoisOfferts, ACCOMPAGNEMENT_INCLUS } from '@/lib/paiements/accompagnement-offert'
import { bilanActivite, bilanVide, htmlBilan } from '@/lib/rapport-mensuel'

const JOUR = 24 * 60 * 60 * 1000
const AGENCE = process.env.AGENCE_NOTIF_EMAIL || process.env.SMTP_USER || ''
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))
const dateFr = (d: Date) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

async function alerteAgence(sujet: string, html: string) {
  if (!AGENCE) return
  await sendMail(AGENCE, sujet, `<div style="font-family:Arial,sans-serif;font-size:14px;">${html}</div>`, { fromName: 'La Gabare — Relances' })
}

// ── Devis non acceptés : J+3, J+7, puis 3 jours avant l'expiration ; l'agence est prévenue à l'expiration ──
export async function relancerDevis() {
  const bilan = { relances: 0, expires: 0, erreurs: 0 }
  const { data } = await supabaseAdmin.from('devis').select('*').eq('statut', 'envoye').not('envoye_at', 'is', null)
  const maintenant = Date.now()
  for (const d of (data || []) as (Devis & { envoye_at: string; relances: number })[]) {
    try {
      const envoye = new Date(d.envoye_at).getTime()
      const expiration = new Date(`${d.validite}T23:59:59`).getTime()
      if (maintenant > expiration) {
        if (d.relances < 9) {
          const { data: c } = await supabaseAdmin.from('clients').select('nom_domaine').eq('id', d.client_id).single()
          await alerteAgence(`Devis expiré sans réponse — ${c?.nom_domaine || d.client_id}`,
            `<p>Le devis ${esc(d.numero)} a expiré sans être accepté, malgré ${d.relances} relance(s) automatique(s). Un appel peut débloquer la situation.</p>
             <p><a href="https://admin.la-gabare.fr/clients/${d.client_id}">Ouvrir la fiche client</a></p>`)
          await supabaseAdmin.from('devis').update({ relances: 9 }).eq('id', d.id)
          bilan.expires++
        }
        continue
      }
      const prochaine =
        d.relances === 0 && maintenant - envoye >= 3 * JOUR ? 1
        : d.relances === 1 && maintenant - envoye >= 7 * JOUR ? 2
        : d.relances === 2 && expiration - maintenant <= 3 * JOUR ? 3
        : 0
      // Pas de relance « dernier rappel » le même jour qu'une autre
      if (!prochaine) continue
      await envoyerDevis(d, prochaine)
      await supabaseAdmin.from('devis').update({ relances: prochaine, derniere_relance_at: new Date().toISOString() }).eq('id', d.id)
      bilan.relances++
    } catch (e) {
      console.error('relance devis', d.id, e)
      bilan.erreurs++
    }
  }
  return bilan
}

// ── Fin des mois offerts : rappels à J-15, J-7, puis arrêt si aucun moyen de paiement n'est enregistré ──
async function aUnAbonnement(customer: string | null) {
  if (!customer) return false
  const { data } = await stripe.subscriptions.list({ customer, status: 'all', limit: 5 })
  return data.some((s) => ['active', 'trialing', 'past_due', 'unpaid'].includes(s.status))
}

function mailFinOffert(nom: string, formule: string, fin: Date, etape: 'j15' | 'j7' | 'fin', recap = '') {
  const titre = etape === 'fin' ? `${esc(nom)}, votre accompagnement est en pause.` : `${esc(nom)}, vos mois offerts se terminent bientôt.`
  const corps = etape === 'fin'
    ? `Vos mois d'accompagnement ${esc(formule)} offerts avec votre site sont arrivés à leur terme le ${dateFr(fin)}. Faute de moyen de paiement enregistré,
       nous avons mis en pause vos articles et publications. Pour les reprendre, il suffit d'enregistrer votre carte ou votre IBAN : tout redémarre aussitôt.`
    : `Vos mois d'accompagnement ${esc(formule)} offerts se terminent le <strong>${dateFr(fin)}</strong>. Pour que vos articles et publications continuent
       sans interruption, enregistrez dès maintenant votre carte ou votre IBAN. Aucun prélèvement n'aura lieu avant cette date.`
  return `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.7;color:#4A3E37;max-width:560px;">
    <p style="font-family:Georgia,serif;font-size:22px;color:#1A1310;">${titre}</p>
    ${recap ? `<p style="margin:0 0 4px 0;font-weight:700;color:#1A1310;">Ce que nous avons fait pour vous depuis le début</p>${recap}` : ''}<p>${corps}</p>
    <p><a href="https://la-gabare.fr/espace-client.html" style="display:inline-block;padding:14px 28px;background:#5A1226;color:#F5F2EC;text-decoration:none;font-weight:600;">Enregistrer mon moyen de paiement &rarr;</a></p>
    <p style="font-size:13px;">Dans votre espace client : Paramètres › Abonnement.</p><p>L'équipe La Gabare</p></div>`
}

// Premier rappel avant la fin des mois offerts : récapitulatif de tout ce qui a été publié depuis le démarrage
async function recapitulatif(c: { id: number; date_debut_abonnement: string | null; rappel_offert: string | null }, etape: string) {
  if (etape === 'fin' || c.rappel_offert || !c.date_debut_abonnement) return ''
  try {
    const b = await bilanActivite(c.id, new Date(c.date_debut_abonnement), new Date())
    return bilanVide(b) ? '' : htmlBilan(b)
  } catch (e) {
    console.error('récapitulatif mois offerts', c.id, e)
    return ''
  }
}

export async function suivreMoisOfferts() {
  const bilan = { rappels: 0, pauses: 0, erreurs: 0 }
  const { data } = await supabaseAdmin.from('clients')
    .select('id, nom_domaine, email_contact, pack_site, abonnement, statut, date_debut_abonnement, stripe_customer_id, rappel_offert, resiliation_demandee_at')
    .eq('statut', 'actif').not('date_debut_abonnement', 'is', null).is('resiliation_demandee_at', null)
  for (const c of data || []) {
    try {
      const inclus = ACCOMPAGNEMENT_INCLUS[String(c.pack_site || '').toLowerCase()]
      const fin = finMoisOfferts(c)
      if (!inclus || !fin || c.rappel_offert === 'fin') continue
      const jours = Math.ceil((fin.getTime() - Date.now()) / JOUR)
      const etape = jours <= 0 ? 'fin' : jours <= 7 ? 'j7' : jours <= 15 ? 'j15' : null
      if (!etape || etape === c.rappel_offert) continue
      if (await aUnAbonnement(c.stripe_customer_id)) {
        await supabaseAdmin.from('clients').update({ rappel_offert: 'fin' }).eq('id', c.id) // moyen de paiement enregistré : plus rien à faire
        continue
      }
      const nomFormule = { village: 'Village', reserve: 'Réserve', grand_cru: 'Grand Cru' }[c.abonnement as string] || inclus.nom
      if (c.email_contact) {
        await sendMail(c.email_contact,
          etape === 'fin' ? `Votre accompagnement est en pause — ${c.nom_domaine}` : `Vos mois offerts se terminent le ${dateFr(fin)} — ${c.nom_domaine}`,
          mailFinOffert(c.nom_domaine, nomFormule, fin, etape, await recapitulatif(c, etape)), { fromName: 'La Gabare', replyTo: AGENCE || undefined })
      }
      if (etape === 'fin') {
        // Plus de plan éditorial tant qu'aucun moyen de paiement n'est enregistré (l'abonnement le réactivera)
        await supabaseAdmin.from('clients').update({ statut: 'inactif', rappel_offert: 'fin' }).eq('id', c.id)
        await alerteAgence(`Fin des mois offerts sans abonnement — ${c.nom_domaine}`,
          `<p>${esc(c.nom_domaine)} n'a pas enregistré de moyen de paiement à la fin de ses mois offerts : accompagnement mis en pause (fiche « inactif »).
           Un appel peut aider à le convertir.</p><p><a href="https://admin.la-gabare.fr/clients/${c.id}">Ouvrir la fiche client</a></p>`)
        bilan.pauses++
      } else {
        await supabaseAdmin.from('clients').update({ rappel_offert: etape }).eq('id', c.id)
        bilan.rappels++
      }
    } catch (e) {
      console.error('mois offerts', c.id, e)
      bilan.erreurs++
    }
  }
  return bilan
}
