import 'server-only'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendMail } from '@/lib/mailer'
import { manquants } from '@/lib/contenus-defs'
import { gabaritMail } from '@/lib/mail-cadre'

export { CONTENUS, contenusDuPack, listeContenus, manquants } from '@/lib/contenus-defs'
export type { ContenuDef, EtatContenu } from '@/lib/contenus-defs'

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))
const AGENCE = process.env.AGENCE_NOTIF_EMAIL || process.env.SMTP_USER || ''
const JOUR = 24 * 60 * 60 * 1000

// HTML de la relance « contenus manquants » (charte e-mail ; signature automatique à la place de « L'équipe La Gabare ») : pur
export function mailContenusManquants(nomDomaine: string, reste: { libelle: string; aide: string }[]) {
  const liste = reste.map((r) => `<li style="margin-bottom:6px;"><strong style="color:#1A1310;font-weight:600;">${esc(r.libelle)}</strong> — ${esc(r.aide)}</li>`).join('')
  return gabaritMail({
    label: 'Votre site',
    titre: `${esc(nomDomaine)}, il nous manque quelques éléments.`,
    corps: `<p style="margin:0 0 16px 0;">Bonjour,</p><p style="margin:0 0 12px 0;">Pour avancer sur le site de ${esc(nomDomaine)}, il nous manque encore :</p>
<ul style="margin:0 0 20px 0;padding-left:20px;">${liste}</ul>
<p style="margin:0 0 16px 0;">Le plus simple : votre espace client, rubrique « Votre projet », où vous pouvez tout compléter en quelques minutes.
Il vous manque quelque chose ? Envoyez ce que vous avez, nous complétons ensemble.</p>`,
    bouton: { texte: 'Compléter mes contenus &rarr;', lien: 'https://la-gabare.fr/espace-client.html' },
  })
}

// Relances : à la date limite puis tous les 5 jours (3 fois), ensuite l'agence est prévenue. Arrêt dès la maquette envoyée.
export async function relancerContenus() {
  const bilan = { relances: 0, alertes: 0, erreurs: 0 }
  const { data } = await supabaseAdmin.from('clients')
    .select('id, nom_domaine, email_contact, pack_site, contenus, contenus_limite, contenus_relances, contenus_derniere_relance_at, maquette_statut, mis_en_ligne_at')
    .not('contenus_limite', 'is', null).is('mis_en_ligne_at', null).is('maquette_statut', null)
  const maintenant = Date.now()
  for (const c of data || []) {
    try {
      const reste = manquants(c)
      if (!reste.length || c.contenus_relances > 3) continue
      if (maintenant < new Date(c.contenus_limite).getTime()) continue
      if (c.contenus_derniere_relance_at && maintenant - new Date(c.contenus_derniere_relance_at).getTime() < 5 * JOUR) continue
      if (c.contenus_relances < 3 && c.email_contact) {
        await sendMail(c.email_contact, `Votre site — il nous manque ${reste.length} élément${reste.length > 1 ? 's' : ''} · ${c.nom_domaine}`,
          mailContenusManquants(c.nom_domaine, reste), { fromName: 'La Gabare', replyTo: AGENCE || undefined })
        bilan.relances++
      } else if (AGENCE) {
        await sendMail(AGENCE, `Contenus toujours incomplets — ${c.nom_domaine}`,
          `<div style="font-family:Arial,sans-serif;font-size:14px;"><p>Après 3 relances, ${esc(c.nom_domaine)} n'a pas fourni : ${reste.map((r) => esc(r.libelle)).join(', ')}.
           Un appel peut débloquer le projet.</p><p><a href="https://admin.la-gabare.fr/clients/${c.id}">Ouvrir la fiche client</a></p></div>`,
          { fromName: 'La Gabare — Projets' })
        bilan.alertes++
      }
      await supabaseAdmin.from('clients').update({
        contenus_relances: c.contenus_relances + 1, contenus_derniere_relance_at: new Date().toISOString(),
      }).eq('id', c.id)
    } catch (e) {
      console.error('relance contenus', c.id, e)
      bilan.erreurs++
    }
  }
  return bilan
}
