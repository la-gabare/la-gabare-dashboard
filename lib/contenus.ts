import 'server-only'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendMail } from '@/lib/mailer'
import { manquants } from '@/lib/contenus-defs'

export { CONTENUS, contenusDuPack, listeContenus, manquants } from '@/lib/contenus-defs'
export type { ContenuDef, EtatContenu } from '@/lib/contenus-defs'

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))
const AGENCE = process.env.AGENCE_NOTIF_EMAIL || process.env.SMTP_USER || ''
const JOUR = 24 * 60 * 60 * 1000

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
        const liste = reste.map((r) => `<li style="margin-bottom:6px;"><strong>${esc(r.libelle)}</strong> — ${esc(r.aide)}</li>`).join('')
        await sendMail(c.email_contact, `Votre site — il nous manque ${reste.length} élément${reste.length > 1 ? 's' : ''} · ${c.nom_domaine}`,
          `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.7;color:#4A3E37;max-width:560px;">
           <p>Bonjour,</p><p>Pour avancer sur le site de ${esc(c.nom_domaine)}, il nous manque encore :</p><ul>${liste}</ul>
           <p>Le plus simple : votre espace client, rubrique « Votre projet », où vous pouvez tout compléter en quelques minutes.
           Il vous manque quelque chose ? Envoyez ce que vous avez, nous complétons ensemble.</p>
           <p><a href="https://la-gabare.fr/espace-client.html" style="display:inline-block;padding:14px 28px;background:#5A1226;color:#F5F2EC;text-decoration:none;font-weight:600;">Compléter mes contenus &rarr;</a></p>
           <p>L'équipe La Gabare</p></div>`, { fromName: 'La Gabare', replyTo: AGENCE || undefined })
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
