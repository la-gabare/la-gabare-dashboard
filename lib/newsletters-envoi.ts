import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendMail } from '@/lib/mailer'

function gabarit(domaine: string, titre: string, contenu: string) {
  return `<div style="font-family:Georgia,serif;max-width:640px;margin:auto;color:#1a1a1a;line-height:1.6"><p style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#8a7355">${domaine}</p><h1 style="font-size:24px;margin:6px 0 20px;font-weight:normal;color:#1a1a1a">${titre}</h1>${contenu}<hr style="border:none;border-top:1px solid #e5ded3;margin:30px 0"><p style="font-size:11px;color:#999;text-align:center">L’abus d’alcool est dangereux pour la santé. À consommer avec modération.</p></div>`
}

// Envoie les newsletters au statut « a_envoyer » (remplace le workflow n8n « 03-Newsletters - Envoi »).
// Une newsletter passe « en_cours » avant l'envoi, puis « envoye » : jamais envoyée deux fois.
export async function envoyerNewslettersEnAttente() {
  const { data: lettres } = await supabaseAdmin.from('newsletters').select('*').eq('status', 'a_envoyer')
  let envoyees = 0
  let emails = 0
  for (const nl of lettres || []) {
    const { error: verrou } = await supabaseAdmin.from('newsletters').update({ status: 'en_cours' }).eq('id', nl.id).eq('status', 'a_envoyer')
    if (verrou) continue
    const { data: client } = await supabaseAdmin.from('clients').select('nom_domaine').eq('id', nl.client_id).single()
    const { data: abonnes } = await supabaseAdmin.from('newsletter_abonnes').select('email').eq('client_id', nl.client_id)
    const titre = nl.titre || `Newsletter ${nl.mois}`
    const html = gabarit(client?.nom_domaine || '', titre, nl.contenu || '')
    let echecs = 0
    for (const a of abonnes || []) {
      try {
        await sendMail(a.email, titre, html, { fromName: client?.nom_domaine || 'La Gabare' })
        emails++
      } catch (err) {
        echecs++
        console.error('Envoi newsletter échoué', nl.id, err)
      }
    }
    // Si tous les envois ont échoué, on la remet en file pour le prochain passage.
    const tousEchoues = echecs > 0 && echecs === (abonnes || []).length
    await supabaseAdmin.from('newsletters').update(
      tousEchoues ? { status: 'a_envoyer' } : { status: 'envoye', sent_at: new Date().toISOString() },
    ).eq('id', nl.id)
    if (!tousEchoues) envoyees++
  }
  return { newsletters: lettres?.length || 0, envoyees, emails }
}
