import 'server-only'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendMail } from '@/lib/mailer'
import { mailContenu, esc, type Ligne } from '@/lib/mails-contenu-html'
import { notifier } from '@/lib/notifier'
import { resumePlan } from '@/lib/plan-resume'

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

const dateFr = (d: string) => new Date(d).toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris', day: 'numeric', month: 'long' }).replace(/^1 /, '1er ')
const moisFr = (d: Date) => d.toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris', month: 'long', year: 'numeric' })

type Cible = { id: number; nom_domaine: string; email_contact: string | null; statut: string | null }

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
      titre: `${x.reseau ? x.reseau.charAt(0).toUpperCase() + x.reseau.slice(1) : 'Réseau social'}${x.format ? ` · ${x.format}` : ''}`,
    })),
  ]
  return lignes.sort((x, y) => x.date.localeCompare(y.date))
}

async function cibleDe(clientId: number): Promise<Cible | null> {
  const { data } = await supabaseAdmin.from('clients').select('id, nom_domaine, email_contact, statut').eq('id', clientId).single()
  return data && data.email_contact && data.statut === 'actif' ? data : null
}


// « de mars » mais « d'octobre » (voyelle)
const deMois = (mois: string) => (/^[aeiouhéèàâ]/i.test(mois) ? `d'${mois}` : `de ${mois}`)

async function envoyerApercu(client: Cible, lignes: Ligne[], mois: string, prefixe = '') {
  await sendMail(client.email_contact!, `${prefixe}Votre programme éditorial ${deMois(mois)} est prêt à valider · ${client.nom_domaine}`,
    mailContenu({ surtitre: `Programme éditorial · ${esc(mois)}`, titre: 'Votre programme du mois est prêt à valider',
      intro: `Voici les contenus prévus pour ${esc(client.nom_domaine)} en ${esc(mois)}.`, lignes,
      pied: 'Merci de relire chaque article et de le valider (ou de demander une modification) depuis votre espace client.',
      bouton: 'Relire et valider', lien: ESPACE }),
    { fromName: 'La Gabare', replyTo: AGENCE || undefined })
}

async function envoyerProgramme(client: Cible, lignes: Ligne[], mois: string, prefixe = '') {
  await sendMail(client.email_contact!, `${prefixe}Votre programme du mois · ${client.nom_domaine}`,
    mailContenu({ surtitre: `Programme de publication · ${esc(mois)}`, titre: `Votre programme ${esc(deMois(mois))}`,
      intro: `Voici le calendrier de publication de ${esc(client.nom_domaine)}.`, lignes,
      pied: 'Rien à faire de votre côté : tout est publié aux dates indiquées. Les contenus restent modifiables depuis votre espace client.',
      bouton: 'Ouvrir mon espace client', lien: ESPACE }),
    { fromName: 'La Gabare', replyTo: AGENCE || undefined })
}

// Plan complet vers le feed Harness (Telegram) : articles et publications des 45 prochains jours
async function notifierPlan(client: Cible, id: string, mois: string, prefixe = '') {
  const debut = new Date().toISOString().slice(0, 10)
  const fin = new Date(Date.now() + 45 * JOUR).toISOString().slice(0, 10)
  const [a, p] = await Promise.all([
    supabaseAdmin.from('articles').select('id, titre, angle, date_publication_prevue').eq('client_id', client.id).gte('date_publication_prevue', debut).lte('date_publication_prevue', fin),
    supabaseAdmin.from('posts').select('article_id, reseau, format, contenu, date_publication_prevue').eq('client_id', client.id).gte('date_publication_prevue', debut).lte('date_publication_prevue', fin),
  ])
  await notifier({
    titre: `${prefixe}Plan éditorial prêt — ${client.nom_domaine} · ${mois}`,
    corps: `${resumePlan(a.data || [], p.data || [])}\n\nL'aperçu part au vigneron au prochain passage (demain 10 h).`,
    niveau: 'info', url: `https://admin.la-gabare.fr/clients/${client.id}`, id,
  })
}

// Essai : envoie les deux mails du mois au contact d'un client, sans toucher au plan ni aux dates d'envoi
export async function envoyerMailsDuMoisEnEssai(clientId: number) {
  const client = await cibleDe(clientId)
  if (!client) return { ok: false, erreur: 'Client inactif ou sans adresse e-mail' }
  const lignes = await contenusEntre(client.id, new Date().toISOString().slice(0, 10), new Date(Date.now() + 45 * JOUR).toISOString().slice(0, 10))
  if (!lignes.length) return { ok: false, erreur: 'Aucun contenu prévu dans les 45 prochains jours' }
  const mois = moisFr(new Date(lignes[0].date))
  await notifierPlan(client, `plan-essai-${client.id}-${Date.now()}`, mois, '[ESSAI] ')
  await envoyerApercu(client, lignes, mois, '[ESSAI] ')
  await envoyerProgramme(client, lignes, mois, '[ESSAI] ')
  return { ok: true, destinataire: client.email_contact, contenus: lignes.length }
}

// Aperçu mensuel puis programme du mois : à appeler chaque jour (cron)
export async function envoyerMailsDuMois() {
  const bilan = { plans_notifies: 0, apercus: 0, programmes: 0, erreurs: 0 }
  const depuis = new Date(Date.now() - 45 * JOUR).toISOString()
  const filtre = (colonnes: string) => supabaseAdmin.from('plans_generation').select(colonnes)
    .eq('status', 'termine').gte('created_at', depuis).or('apercu_envoye_at.is.null,programme_envoye_at.is.null')
  type Plan = { id: number; client_id: number; created_at: string; apercu_envoye_at: string | null; programme_envoye_at: string | null; plan_notifie_at?: string | null }
  let { data: plans, error } = await filtre('id, client_id, created_at, apercu_envoye_at, programme_envoye_at, plan_notifie_at') as unknown as { data: Plan[] | null; error: unknown }
  let notifPlan = true
  if (error) {
    // sql/plan_notifie.sql pas encore exécuté : on envoie sans notification préalable (comportement précédent)
    notifPlan = false
    ;({ data: plans, error } = await filtre('id, client_id, created_at, apercu_envoye_at, programme_envoye_at') as unknown as { data: Plan[] | null; error: unknown })
  }
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

      if (!plan.apercu_envoye_at && notifPlan) {
        // Étape 1 : le plan complet arrive d'abord sur Telegram ; l'aperçu au vigneron part au passage suivant (≥ 20 h après)
        if (!plan.plan_notifie_at) {
          await notifierPlan(client, `plan-${plan.id}`, mois)
          await supabaseAdmin.from('plans_generation').update({ plan_notifie_at: new Date().toISOString() }).eq('id', plan.id)
          bilan.plans_notifies++
          continue
        }
        if (Date.now() - new Date(plan.plan_notifie_at).getTime() < 20 * 60 * 60 * 1000) continue
      }
      if (!plan.apercu_envoye_at) {
        await envoyerApercu(client, lignes, mois)
        await supabaseAdmin.from('plans_generation').update({ apercu_envoye_at: new Date().toISOString() }).eq('id', plan.id)
        await notifier({ titre: `Aperçu du mois envoyé au vigneron — ${client.nom_domaine}`, niveau: 'info', url: `https://admin.la-gabare.fr/clients/${client.id}` })
        bilan.apercus++
      } else if (!plan.programme_envoye_at) {
        const articles = lignes.filter((l) => l.type === 'Article')
        const tousValides = articles.length > 0 && articles.every((l) => l.valide)
        const delaiPasse = Date.now() - new Date(plan.apercu_envoye_at).getTime() > 7 * JOUR
        if (!tousValides && !delaiPasse) continue
        await envoyerProgramme(client, lignes, mois)
        await supabaseAdmin.from('plans_generation').update({ programme_envoye_at: new Date().toISOString() }).eq('id', plan.id)
        await notifier({ titre: `Programme du mois envoyé au vigneron — ${client.nom_domaine}`, niveau: 'info', url: `https://admin.la-gabare.fr/clients/${client.id}` })
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
      mailContenu({ surtitre: 'Programme de la semaine', titre: `Du ${esc(dateFr(d.date_debut))} au ${esc(dateFr(d.date_fin))}`,
        intro: `Voici ce qui est prévu cette semaine pour ${esc(client.nom_domaine)}.`, lignes,
        pied: 'Un changement à faire ? Répondez simplement à ce message.', bouton: 'Ouvrir mon espace client', lien: ESPACE }),
      { fromName: 'La Gabare', replyTo: AGENCE || undefined })
    await notifier({ titre: `Programme de la semaine envoyé — ${client.nom_domaine}`, corps: `${d.date_debut} → ${d.date_fin}`, niveau: 'info', url: `https://admin.la-gabare.fr/clients/${client.id}` })
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
