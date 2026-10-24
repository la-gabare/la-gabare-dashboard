import 'server-only'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendMail } from '@/lib/mailer'

// Trois mails au vigneron abonné, repris du workflow n8n « Agent de contenu mensuel » :
//  - aperçu du mois à valider (dès que le plan et les contenus du mois sont prêts),
//  - « votre programme du mois » (quand tout est validé, ou 7 jours après l'aperçu),
//  - programme d'une semaine (bouton « Mail hebdomadaire » de la fiche client).
// Textes factuels (titres et dates) : aucun contenu promotionnel sur l'alcool (loi Évin).
// Les colonnes apercu_envoye_at / programme_envoye_at viennent de sql/mails_contenu.sql ; tant qu'elles
// n'existent pas, les envois automatiques du mois sont simplement ignorés (pas d'alerte).

const AGENCE = process.env.AGENCE_NOTIF_EMAIL || process.env.SMTP_USER || ''
const ESPACE = 'https://la-gabare.fr/espace-client.html'
const JOUR = 24 * 60 * 60 * 1000

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))
const dateFr = (d: string) => new Date(d).toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris', weekday: 'long', day: 'numeric', month: 'long' })
const moisFr = (d: Date) => d.toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris', month: 'long', year: 'numeric' })

type Ligne = { date: string; type: 'Article' | 'Publication'; titre: string; valide?: boolean }
type Cible = { id: number; nom_domaine: string; email_contact: string | null; statut: string | null }

function gabarit(intro: string, lignes: Ligne[], pied: string, bouton: string) {
  const items = lignes.map((l) =>
    `<li style="margin-bottom:6px;"><strong>${esc(dateFr(l.date))}</strong> — ${l.type} : ${esc(l.titre)}${l.valide ? ' ✓' : ''}</li>`).join('')
  return `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.7;color:#4A3E37;max-width:560px;">
    <p>Bonjour,</p><p>${intro}</p><ul style="padding-left:20px;">${items}</ul><p>${pied}</p>
    <p><a href="${ESPACE}" style="display:inline-block;padding:14px 28px;background:#5A1226;color:#F5F2EC;text-decoration:none;font-weight:600;">${bouton}</a></p>
    <p>L'équipe La Gabare</p></div>`
}

async function contenusEntre(clientId: number, debut: string, fin: string): Promise<Ligne[]> {
  const [a, p] = await Promise.all([
    supabaseAdmin.from('articles').select('titre, date_publication_prevue, plan_editorial_valide')
      .eq('client_id', clientId).gte('date_publication_prevue', debut).lte('date_publication_prevue', fin),
    supabaseAdmin.from('posts').select('contenu, reseau, format, date_publication_prevue')
      .eq('client_id', clientId).gte('date_publication_prevue', debut).lte('date_publication_prevue', fin),
  ])
  const lignes: Ligne[] = [
    ...(a.data || []).map((x) => ({ date: x.date_publication_prevue, type: 'Article' as const, titre: x.titre, valide: x.plan_editorial_valide === true })),
    ...(p.data || []).map((x) => ({
      date: x.date_publication_prevue, type: 'Publication' as const,
      titre: `${x.reseau || 'réseau'}${x.format ? ` (${x.format})` : ''}`,
    })),
  ]
  return lignes.sort((x, y) => x.date.localeCompare(y.date))
}

async function cibleDe(clientId: number): Promise<Cible | null> {
  const { data } = await supabaseAdmin.from('clients').select('id, nom_domaine, email_contact, statut').eq('id', clientId).single()
  return data && data.email_contact && data.statut === 'actif' ? data : null
}

// Aperçu mensuel puis programme du mois : à appeler chaque jour (cron)
export async function envoyerMailsDuMois() {
  const bilan = { apercus: 0, programmes: 0, erreurs: 0 }
  const depuis = new Date(Date.now() - 45 * JOUR).toISOString()
  const { data: plans, error } = await supabaseAdmin.from('plans_generation')
    .select('id, client_id, created_at, apercu_envoye_at, programme_envoye_at')
    .eq('status', 'termine').gte('created_at', depuis).or('apercu_envoye_at.is.null,programme_envoye_at.is.null')
  if (error) return { ...bilan, ignore: 'colonnes absentes : exécuter sql/mails_contenu.sql' }

  const aujourdhui = new Date().toISOString().slice(0, 10)
  const horizon = new Date(Date.now() + 45 * JOUR).toISOString().slice(0, 10)
  for (const plan of plans || []) {
    try {
      const client = await cibleDe(plan.client_id)
      if (!client) continue
      const lignes = await contenusEntre(client.id, aujourdhui, horizon)
      if (!lignes.length) continue
      const mois = moisFr(new Date(lignes[0].date))

      if (!plan.apercu_envoye_at) {
        await sendMail(client.email_contact!, `Votre programme éditorial de ${mois} est prêt à valider · ${client.nom_domaine}`,
          gabarit(`Votre programme de contenus de ${esc(mois)} est prêt. Voici ce qui est prévu pour ${esc(client.nom_domaine)} :`, lignes,
            'Merci de relire chaque article et de le valider (ou de demander une modification) depuis votre espace client.', 'Relire et valider'),
          { fromName: 'La Gabare', replyTo: AGENCE || undefined })
        await supabaseAdmin.from('plans_generation').update({ apercu_envoye_at: new Date().toISOString() }).eq('id', plan.id)
        bilan.apercus++
      } else if (!plan.programme_envoye_at) {
        const articles = lignes.filter((l) => l.type === 'Article')
        const tousValides = articles.length > 0 && articles.every((l) => l.valide)
        const delaiPasse = Date.now() - new Date(plan.apercu_envoye_at).getTime() > 7 * JOUR
        if (!tousValides && !delaiPasse) continue
        await sendMail(client.email_contact!, `Votre programme du mois · ${client.nom_domaine}`,
          gabarit(`Voici le programme de publication de ${esc(mois)} pour ${esc(client.nom_domaine)} :`, lignes,
            'Rien à faire de votre côté : tout est publié aux dates indiquées. Les contenus restent modifiables depuis votre espace client.', 'Ouvrir mon espace client'),
          { fromName: 'La Gabare', replyTo: AGENCE || undefined })
        await supabaseAdmin.from('plans_generation').update({ programme_envoye_at: new Date().toISOString() }).eq('id', plan.id)
        bilan.programmes++
      }
    } catch (e) {
      console.error('mails contenu', plan.id, e)
      bilan.erreurs++
    }
  }
  return bilan
}

// Programme d'une semaine : une demande de la table mail_hebdo_requests (créée par le bouton de la fiche client)
export async function envoyerMailHebdo(demandeId: number) {
  const { data: d } = await supabaseAdmin.from('mail_hebdo_requests').select('*').eq('id', demandeId).eq('status', 'en_attente').single()
  if (!d) return false
  const fin = async (status: string, error_message: string | null) => {
    await supabaseAdmin.from('mail_hebdo_requests').update({ status, error_message }).eq('id', demandeId)
    return status === 'envoye'
  }
  try {
    const client = await cibleDe(d.client_id)
    if (!client) return fin('erreur', 'Client inactif ou sans adresse e-mail')
    if (!d.date_debut || !d.date_fin) return fin('erreur', 'Période manquante')
    const lignes = await contenusEntre(client.id, d.date_debut, d.date_fin)
    if (!lignes.length) return fin('erreur', 'Aucun contenu prévu sur cette période')
    await sendMail(client.email_contact!, `Votre programme de la semaine · ${client.nom_domaine}`,
      gabarit(`Voici ce qui est prévu du ${esc(dateFr(d.date_debut))} au ${esc(dateFr(d.date_fin))} pour ${esc(client.nom_domaine)} :`, lignes,
        'Un changement à faire ? Répondez simplement à ce message.', 'Ouvrir mon espace client'),
      { fromName: 'La Gabare', replyTo: AGENCE || undefined })
    return fin('envoye', null)
  } catch (e) {
    console.error('mail hebdo', demandeId, e)
    return fin('erreur', e instanceof Error ? e.message.slice(0, 200) : 'Erreur inconnue')
  }
}

// Rattrapage : demandes restées en attente (envoi immédiat échoué ou interrompu)
export async function envoyerMailsHebdoEnAttente() {
  const { data } = await supabaseAdmin.from('mail_hebdo_requests').select('id').eq('status', 'en_attente')
  let envoyes = 0
  for (const r of data || []) if (await envoyerMailHebdo(r.id)) envoyes++
  return { en_attente: data?.length || 0, envoyes }
}
