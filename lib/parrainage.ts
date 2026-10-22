import 'server-only'
import crypto from 'crypto'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendMail } from '@/lib/mailer'

// Règles du parrainage (modifiables ici)
export const PARRAINAGE = {
  moisOffertsFilleul: 1, // mois d'accompagnement offerts en plus au nouveau client
  // Parrain : un mois de son abonnement offert, déduit de sa prochaine facture Stripe
}

const AGENCE = process.env.AGENCE_NOTIF_EMAIL || process.env.SMTP_USER || ''
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))
const PRIX_HT: Record<string, number> = { village: 150, reserve: 350, grand_cru: 550 }
const TVA_PCT = Number(process.env.AGENCE_TVA_TAUX ?? 20)

export const lienParrainage = (code: string) => `https://la-gabare.fr/audit-gratuit.html?parrain=${encodeURIComponent(code)}`

// Code personnel du client, créé à la première demande (ex. COTEAUX-7K2F)
export async function codeParrainage(client: { id: number; nom_domaine: string; code_parrainage?: string | null }) {
  if (client.code_parrainage) return client.code_parrainage
  const base = client.nom_domaine.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase()
    .replace(/\b(DOMAINE|CHATEAU|CLOS|LE|LA|LES|DES|DU|DE)\b/g, ' ').replace(/[^A-Z0-9]+/g, ' ').trim().split(' ')[0]?.slice(0, 10) || 'VIN'
  for (let i = 0; i < 5; i++) {
    const code = `${base}-${crypto.randomBytes(3).toString('hex').toUpperCase().slice(0, 4)}`
    const { error } = await supabaseAdmin.from('clients').update({ code_parrainage: code }).eq('id', client.id).is('code_parrainage', null)
    if (!error) return code
  }
  throw new Error('Code de parrainage impossible à créer')
}

// Client parrain correspondant à un code saisi par un prospect
export async function parrainParCode(code: unknown) {
  const c = String(code || '').trim().toUpperCase()
  if (!/^[A-Z0-9]{1,10}-[A-Z0-9]{4}$/.test(c)) return null
  const { data } = await supabaseAdmin.from('clients').select('id, nom_domaine').eq('code_parrainage', c).maybeSingle()
  return data
}

// Au premier paiement du filleul (acompte) : récompense du parrain, une seule fois par filleul
export async function recompenserParrain(filleulId: number) {
  const { data: f } = await supabaseAdmin.from('clients')
    .select('id, nom_domaine, parrain_id, parrainage_recompense_at').eq('id', filleulId).single()
  if (!f?.parrain_id || f.parrainage_recompense_at) return
  const { data: p } = await supabaseAdmin.from('clients')
    .select('id, nom_domaine, email_contact, abonnement, stripe_customer_id').eq('id', f.parrain_id).single()
  if (!p) return
  await supabaseAdmin.from('clients').update({ parrainage_recompense_at: new Date().toISOString() }).eq('id', f.id)

  const montantCents = Math.round((PRIX_HT[p.abonnement] || 0) * (1 + TVA_PCT / 100) * 100)
  let credite = false
  if (p.stripe_customer_id && montantCents > 0) {
    // Crédit sur le compte Stripe du parrain : déduit automatiquement de sa prochaine facture d'abonnement
    const { stripe } = await import('@/lib/stripe')
    await stripe.customers.createBalanceTransaction(p.stripe_customer_id, {
      amount: -montantCents, currency: 'eur', description: `Parrainage — ${f.nom_domaine} (1 mois offert)`,
      metadata: { filleul_id: String(f.id) },
    })
    credite = true
  }
  const montant = (montantCents / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })
  if (p.email_contact) {
    await sendMail(p.email_contact, `Merci pour votre recommandation — 1 mois offert`,
      `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.7;color:#4A3E37;max-width:560px;"><p>Bonjour,</p>
       <p>${esc(f.nom_domaine)} a rejoint La Gabare grâce à vous. Merci !</p>
       <p>${credite ? `Comme promis, <strong>un mois d'accompagnement vous est offert</strong> : ${montant} seront déduits de votre prochaine facture.`
         : `Comme promis, <strong>un mois d'accompagnement vous est offert</strong> : nous l'appliquons sur votre prochaine facture.`}</p>
       <p>L'équipe La Gabare</p></div>`, { fromName: 'La Gabare', replyTo: AGENCE || undefined })
  }
  if (AGENCE) {
    await sendMail(AGENCE, `Parrainage récompensé — ${p.nom_domaine} → ${f.nom_domaine}`,
      `<p style="font-family:Arial,sans-serif;font-size:14px;">${esc(f.nom_domaine)} a réglé son acompte : ${esc(p.nom_domaine)} reçoit un mois offert.
       ${credite ? `Crédit de ${montant} enregistré dans Stripe (déduit de sa prochaine facture).` : 'Aucun abonnement Stripe trouvé pour le parrain : à appliquer à la main.'}</p>`,
      { fromName: 'La Gabare — Parrainage' })
  }
}
