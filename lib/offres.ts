import 'server-only'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendMail } from '@/lib/mailer'
import { gabarit } from '@/lib/rapport-mensuel'

// Propositions d'options au bon moment (tâche quotidienne). Chaque proposition part une seule fois par client
// (la traduction : une fois par an), au plus une proposition tous les 60 jours, jamais pendant la création du site.

const AGENCE = process.env.AGENCE_NOTIF_EMAIL || process.env.SMTP_USER || ''
const JOUR = 24 * 60 * 60 * 1000
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))
const RDV = 'https://cal.com/la-gabare/appel-decouverte-la-gabare'

interface ClientOffre {
  id: number
  nom_domaine: string
  email_contact: string | null
  pack_site: string | null
  abonnement: string | null
  statut: string | null
  mis_en_ligne_at: string | null
  date_debut_abonnement: string | null
  resiliation_demandee_at: string | null
  offres_envoyees: Record<string, string> | null
}

interface Offre {
  cle: (c: ClientOffre, annee: number) => string
  eligible: (c: ClientOffre, ctx: { traductionAchetee: boolean; mois: number }) => boolean
  sujet: (c: ClientOffre) => string
  titre: (c: ClientOffre) => string
  corps: (c: ClientOffre) => string
}

const moisDepuis = (d: string | null) => (d ? (Date.now() - new Date(d).getTime()) / (30.44 * JOUR) : 0)
const p = (t: string) => `<p style="margin:0 0 14px 0;">${t}</p>`

export const OFFRES: Offre[] = [
  {
    // Site Essentiel en ligne depuis 6 mois : la boutique en ligne (Pack Pro)
    cle: () => 'boutique',
    eligible: (c) => String(c.pack_site).toLowerCase() === 'essentiel' && moisDepuis(c.mis_en_ligne_at) >= 6,
    sujet: (c) => `Et si ${c.nom_domaine} vendait en ligne ?`,
    titre: (c) => `${esc(c.nom_domaine)}, prêt à vendre vos vins en ligne ?`,
    corps: () => p(`Votre site tourne depuis six mois : c'est le bon moment pour lui ajouter une <strong>boutique en ligne</strong>.
      Vos clients commandent directement vos cuvées, le paiement arrive sur votre compte, et vous gérez stock et commandes depuis votre espace.`)
      + p(`Le passage au <strong>Pack Pro</strong> ajoute aussi un <strong>espace professionnels</strong> pour les cavistes et restaurateurs :
      tarifs pros, fiches techniques, demandes d'échantillons. Nous reprenons votre site existant, sans repartir de zéro.`),
  },
  {
    // Chaque début de printemps (mars), avant la saison touristique : la traduction du site
    cle: (_c, annee) => `traduction-${annee}`,
    eligible: (c, ctx) => ctx.mois === 2 && Boolean(c.mis_en_ligne_at) && !ctx.traductionAchetee
      && !['premium'].includes(String(c.pack_site).toLowerCase()),
    sujet: (c) => `Saison touristique : ${c.nom_domaine} en anglais ?`,
    titre: (c) => `${esc(c.nom_domaine)}, accueillez aussi les visiteurs étrangers.`,
    corps: () => p(`La saison des visites approche. Une bonne partie des œnotouristes de la Loire viennent de l'étranger et cherchent
      leurs domaines en anglais : un site traduit les fait venir jusqu'à votre caveau.`)
      + p(`L'<strong>option traduction</strong> (350 € HT par langue) traduit tout votre site, en respectant les règles de la loi Évin
      et le vocabulaire du vin. Nous pouvons la mettre en ligne avant les premiers visiteurs.`),
  },
  {
    // Abonné Village depuis 4 mois : passer en Réserve
    cle: () => 'reserve',
    eligible: (c) => c.abonnement === 'village' && moisDepuis(c.date_debut_abonnement) >= 4,
    sujet: (c) => `${c.nom_domaine} : passer à la vitesse supérieure ?`,
    titre: (c) => `${esc(c.nom_domaine)}, deux fois plus présent en ligne.`,
    corps: () => p(`Cela fait quatre mois que nous publions pour vous avec la formule Village. Pour aller plus loin, la formule
      <strong>Réserve</strong> double le rythme : 8 articles et 8 publications par mois, Instagram et Facebook gérés, réponses aux avis sous 72 h.`)
      + p(`Le changement se fait en deux clics depuis votre espace client (Paramètres › Abonnement › Changer de formule),
      et s'applique à partir du prochain prélèvement.`),
  },
]

export async function proposerOffres() {
  const bilan = { envoyees: 0, erreurs: 0 }
  const maintenant = new Date()
  const annee = maintenant.getFullYear()
  const { data } = await supabaseAdmin.from('clients')
    .select('id, nom_domaine, email_contact, pack_site, abonnement, statut, mis_en_ligne_at, date_debut_abonnement, resiliation_demandee_at, offres_envoyees')
    .eq('statut', 'actif').eq('offres_desactivees', false).is('resiliation_demandee_at', null).not('mis_en_ligne_at', 'is', null)

  for (const c of (data || []) as ClientOffre[]) {
    try {
      if (!c.email_contact) continue
      const deja = c.offres_envoyees || {}
      const derniere = Math.max(0, ...Object.values(deja).map((d) => new Date(d).getTime()))
      if (Date.now() - derniere < 60 * JOUR) continue // au plus une proposition tous les 60 jours

      const { data: devis } = await supabaseAdmin.from('devis').select('lignes').eq('client_id', c.id).eq('statut', 'accepte')
      const traductionAchetee = (devis || []).some((d) => JSON.stringify(d.lignes).toLowerCase().includes('traduction'))
      const offre = OFFRES.find((o) => !deja[o.cle(c, annee)] && o.eligible(c, { traductionAchetee, mois: maintenant.getMonth() }))
      if (!offre) continue

      const corps = offre.corps(c) + `<p style="margin:0 0 14px 0;">Envie d'en parler ? Réservez 20 minutes, ou répondez simplement à ce message.</p>
        <p style="margin:0 0 8px 0;"><a href="${RDV}" style="display:inline-block;padding:12px 24px;background:#5A1226;color:#F5F2EC;text-decoration:none;font-weight:600;">Réserver un appel &rarr;</a></p>
        <p style="margin:16px 0 0 0;font-size:12px;color:#7a6f66;">Vous ne souhaitez plus recevoir nos suggestions ? Répondez « stop » à ce message.</p>`
      await sendMail(c.email_contact, offre.sujet(c), gabarit('Une idée pour votre domaine', offre.titre(c), corps),
        { fromName: 'La Gabare', replyTo: AGENCE || undefined })
      await supabaseAdmin.from('clients')
        .update({ offres_envoyees: { ...deja, [offre.cle(c, annee)]: maintenant.toISOString() } }).eq('id', c.id)
      if (AGENCE) {
        await sendMail(AGENCE, `Proposition envoyée — ${c.nom_domaine} : ${offre.sujet(c)}`,
          `<p style="font-family:Arial,sans-serif;font-size:14px;">La proposition « ${esc(offre.sujet(c))} » vient d'être envoyée à ${esc(c.nom_domaine)}.
           Pensez à le relancer d'ici une semaine s'il ne répond pas.</p>
           <p style="font-family:Arial,sans-serif;font-size:14px;"><a href="https://admin.la-gabare.fr/clients/${c.id}">Ouvrir la fiche client</a></p>`,
          { fromName: 'La Gabare — Propositions' })
      }
      bilan.envoyees++
    } catch (e) {
      console.error('proposition offre', c.id, e)
      bilan.erreurs++
    }
  }
  return bilan
}
