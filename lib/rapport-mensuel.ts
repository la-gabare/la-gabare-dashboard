import 'server-only'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendMail } from '@/lib/mailer'
import { gabaritMail, SANS, SERIF } from '@/lib/mail-cadre'

// Bilan d'activité d'un abonné sur une période : sert au rapport mensuel et au récapitulatif de fin des mois offerts.

const AGENCE = process.env.AGENCE_NOTIF_EMAIL || process.env.SMTP_USER || ''
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))
const RESEAUX: Record<string, string> = { instagram: 'Instagram', facebook: 'Facebook', linkedin: 'LinkedIn', tiktok: 'TikTok' }

export interface Bilan {
  articles: string[]
  posts: number
  postsParReseau: Record<string, number>
  avis: number
  noteMoyenne: number | null
  avisRepondus: number
  newsletters: number
  aVenir: { articles: number; posts: number }
}

export async function bilanActivite(clientId: number, debut: Date, fin: Date): Promise<Bilan> {
  const d = debut.toISOString()
  const f = fin.toISOString()
  const dans30 = new Date(fin.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
  const [art, pst, avis, nl, artAVenir, pstAVenir] = await Promise.all([
    supabaseAdmin.from('articles').select('titre').eq('client_id', clientId).gte('date_publication_reelle', d).lt('date_publication_reelle', f),
    supabaseAdmin.from('posts').select('reseau').eq('client_id', clientId).gte('date_publication_reelle', d).lt('date_publication_reelle', f),
    supabaseAdmin.from('avis_google').select('note, published_at').eq('client_id', clientId).gte('date_avis', d).lt('date_avis', f),
    supabaseAdmin.from('newsletters').select('id').eq('client_id', clientId).gte('sent_at', d).lt('sent_at', f),
    supabaseAdmin.from('articles').select('id', { count: 'exact', head: true }).eq('client_id', clientId).is('date_publication_reelle', null).gte('date_publication_prevue', f).lt('date_publication_prevue', dans30),
    supabaseAdmin.from('posts').select('id', { count: 'exact', head: true }).eq('client_id', clientId).is('date_publication_reelle', null).gte('date_publication_prevue', f).lt('date_publication_prevue', dans30),
  ])
  const postsParReseau: Record<string, number> = {}
  for (const p of pst.data || []) postsParReseau[p.reseau || 'autre'] = (postsParReseau[p.reseau || 'autre'] || 0) + 1
  const notes = (avis.data || []).map((a) => Number(a.note)).filter((n) => n > 0)
  return {
    articles: (art.data || []).map((a) => a.titre).filter(Boolean),
    posts: (pst.data || []).length,
    postsParReseau,
    avis: (avis.data || []).length,
    noteMoyenne: notes.length ? Math.round((notes.reduce((s, n) => s + n, 0) / notes.length) * 10) / 10 : null,
    avisRepondus: (avis.data || []).filter((a) => a.published_at).length,
    newsletters: (nl.data || []).length,
    aVenir: { articles: artAVenir.count || 0, posts: pstAVenir.count || 0 },
  }
}

export const bilanVide = (b: Bilan) => !b.articles.length && !b.posts && !b.avis && !b.newsletters

// Bloc HTML (e-mail) : chiffres clés + titres des articles + à venir
export function htmlBilan(b: Bilan) {
  const sans = SANS
  const p = (marge: string) => `margin:${marge};${sans};font-size:14px;font-weight:300;line-height:1.7;color:#4A3E37;`
  const case_ = (chiffre: string | number, libelle: string) => `<td width="33%" style="padding:16px 8px;text-align:center;background-color:#F5F2EC;border:1px solid rgba(26,19,16,0.07);border-radius:3px;">
    <div style="${SERIF};font-size:34px;font-weight:600;line-height:1.1;color:#1A1310;">${chiffre}</div><div style="${sans};font-size:11px;font-weight:500;letter-spacing:1.5px;text-transform:uppercase;color:#4A3E37;margin-top:6px;">${libelle}</div></td>`
  const reseaux = Object.entries(b.postsParReseau).map(([r, n]) => `${RESEAUX[r] || r} : ${n}`).join(' · ')
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="6" style="margin:8px 0 16px 0;border-collapse:separate;"><tr>
      ${case_(b.articles.length, b.articles.length > 1 ? 'articles publiés' : 'article publié')}
      ${case_(b.posts, b.posts > 1 ? 'publications' : 'publication')}
      ${case_(b.avis, b.avis > 1 ? 'avis Google' : 'avis Google')}
    </tr></table>
    ${reseaux ? `<p style="${p('0 0 10px 0')}">Réseaux : ${esc(reseaux)}</p>` : ''}
    ${b.avis ? `<p style="${p('0 0 10px 0')}">Avis : ${b.noteMoyenne !== null ? `note moyenne ${String(b.noteMoyenne).replace('.', ',')}/5, ` : ''}${b.avisRepondus} réponse${b.avisRepondus > 1 ? 's' : ''} publiée${b.avisRepondus > 1 ? 's' : ''}.</p>` : ''}
    ${b.newsletters ? `<p style="${p('0 0 10px 0')}">Newsletter : ${b.newsletters} envoi${b.newsletters > 1 ? 's' : ''} à vos abonnés.</p>` : ''}
    ${b.articles.length ? `<p style="margin:20px 0 8px 0;${sans};font-size:11px;font-weight:600;letter-spacing:2.5px;text-transform:uppercase;color:#B08D57;">Articles publiés</p>
      <ul style="${p('0 0 12px 0')}padding-left:20px;">${b.articles.map((t) => `<li style="margin-bottom:4px;">${esc(t)}</li>`).join('')}</ul>` : ''}
    ${b.aVenir.articles || b.aVenir.posts ? `<p style="${p('12px 0 0 0')}">À venir dans les 30 prochains jours : ${b.aVenir.articles} article${b.aVenir.articles > 1 ? 's' : ''} et ${b.aVenir.posts} publication${b.aVenir.posts > 1 ? 's' : ''}, déjà planifiés.</p>` : ''}`
}

// HTML du bilan mensuel envoyé à l'abonné : pur, prévisualisable
export function mailBilanMensuel(nomDomaine: string, nomMois: string, b: Bilan) {
  return gabarit(
    `Votre bilan de ${nomMois}`, `${esc(nomDomaine)}, voici votre mois en ligne.`,
    `${htmlBilan(b)}<p style="margin:16px 0 0 0;">Retrouvez le détail et validez les prochains contenus dans votre espace client.</p>`)
}

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']

// Début de mois (du 1er au 3, heure de Paris, au cas où la tâche du 1er échoue) : bilan du mois écoulé, une seule fois par abonné
export async function envoyerRapportsMensuels() {
  const bilan = { envoyes: 0, vides: 0, erreurs: 0 }
  const paris = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Paris' }))
  if (paris.getDate() > 3) return bilan
  const fin = new Date(Date.UTC(paris.getFullYear(), paris.getMonth(), 1))
  const debut = new Date(Date.UTC(paris.getFullYear(), paris.getMonth() - 1, 1))
  const cleMois = `${debut.getUTCFullYear()}-${String(debut.getUTCMonth() + 1).padStart(2, '0')}`
  const nomMois = `${MOIS[debut.getUTCMonth()]} ${debut.getUTCFullYear()}`

  const { data } = await supabaseAdmin.from('clients')
    .select('id, nom_domaine, email_contact, rapport_mensuel_mois')
    .eq('statut', 'actif').not('date_debut_abonnement', 'is', null)
  for (const c of data || []) {
    if (c.rapport_mensuel_mois === cleMois || !c.email_contact) continue
    try {
      const b = await bilanActivite(c.id, debut, fin)
      if (bilanVide(b)) {
        bilan.vides++ // rien de publié : pas de rapport vide, l'agence est prévenue plus bas
      } else {
        await sendMail(c.email_contact, `Votre bilan de ${nomMois} — ${c.nom_domaine}`, mailBilanMensuel(c.nom_domaine, nomMois, b),
          { fromName: 'La Gabare', replyTo: AGENCE || undefined })
        bilan.envoyes++
      }
      await supabaseAdmin.from('clients').update({ rapport_mensuel_mois: cleMois }).eq('id', c.id)
    } catch (e) {
      console.error('rapport mensuel', c.id, e)
      bilan.erreurs++
    }
  }
  if (bilan.vides && AGENCE) {
    await sendMail(AGENCE, `Bilans de ${nomMois} : ${bilan.vides} abonné(s) sans publication`,
      `<p style="font-family:Arial,sans-serif;font-size:14px;">${bilan.vides} abonné(s) actif(s) n'ont eu aucun article, post ni avis en ${nomMois} : aucun bilan ne leur a été envoyé. À vérifier dans l'admin (plans éditoriaux).</p>`,
      { fromName: 'La Gabare — Bilans' })
  }
  return bilan
}

// Mails aux abonnés (bilan, offres) : gabarit unique de la charte, bouton vers l'espace client
export function gabarit(surtitre: string, titre: string, corps: string) {
  return gabaritMail({ label: surtitre, titre, corps,
    bouton: { texte: 'Ouvrir mon espace client &rarr;', lien: 'https://la-gabare.fr/espace-client.html' } })
}
