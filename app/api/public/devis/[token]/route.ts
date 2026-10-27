import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendMail } from '@/lib/mailer'
import { decouper, envoyerEcheance, lienPaiement, euros, Echeance } from '@/lib/paiements/echeancier'
import { htmlDevis, STYLE_DEVIS, AGENCE, Devis, packDuDevis } from '@/lib/paiements/devis'
import { ipDe } from '@/lib/leads/public'
import { notifier, eurosCourt } from '@/lib/notifier'

export const dynamic = 'force-dynamic'

const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))

function page(titre: string, contenu: string, status = 200) {
  return new NextResponse(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(titre)} — La Gabare</title><meta name="robots" content="noindex">
<style>
body{margin:0;background:#EDE9E2;font-family:Arial,sans-serif;color:#1A1310;padding:32px 16px}
.carte{max-width:760px;margin:0 auto;background:#F5F2EC;border:1px solid rgba(26,19,16,.1);padding:40px}
.accepter{margin-top:28px;padding-top:24px;border-top:2px solid #1A1310}
.accepter h2{font-family:Georgia,serif;font-weight:400;font-size:22px;margin:0 0 12px}
.accepter label{display:block;font-size:14px;margin-bottom:12px}
.accepter input[type=text]{width:100%;max-width:360px;padding:10px;border:1px solid #c9bfb2;font-size:15px;box-sizing:border-box}
.btn{display:inline-block;padding:14px 28px;background:#5A1226;color:#F5F2EC;border:0;font-size:15px;font-weight:600;cursor:pointer;text-decoration:none}
.lien{background:none;border:0;color:#5A1226;text-decoration:underline;cursor:pointer;font-size:14px;padding:0}
.etat{padding:12px 16px;background:#e9f2e6;border:1px solid #b9d3b0;margin-bottom:24px;font-size:14px}
${STYLE_DEVIS}
@media (max-width:520px){.carte{padding:24px}}
@media print{body{background:#fff;padding:0}.carte{border:0;padding:0}.accepter,.noprint{display:none}}
</style></head><body><div class="carte">${contenu}</div></body></html>`,
    { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}

async function charger(token: string) {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return null
  const { data: d } = await supabaseAdmin.from('devis').select('*').eq('token', token).single()
  if (!d) return null
  const { data: client } = await supabaseAdmin.from('clients').select('id, nom_domaine, email_contact').eq('id', d.client_id).single()
  return client ? { d: d as Devis, client } : null
}

const expire = (d: Devis) => new Date(`${d.validite}T23:59:59`) < new Date()

export async function GET(_req: NextRequest, { params: paramsP }: { params: Promise<{ token: string }> }) {
  const params = await paramsP
  const r = await charger(String(params.token || ''))
  if (!r) return page('Devis introuvable', '<p>Ce lien de devis n\'est pas valide.</p>', 404)
  const { d, client } = r

  const imprimer = '<p class="noprint" style="text-align:right;margin:0 0 16px"><button class="lien" onclick="window.print()">Télécharger en PDF / imprimer</button></p>'
  let bas = ''
  if (d.statut === 'accepte') {
    const { data: e1 } = await supabaseAdmin.from('echeances').select('token, statut').eq('client_id', d.client_id).eq('ordre', 1).neq('statut', 'annule').limit(1)
    bas = `<div class="etat">Devis accepté le ${new Date(d.accepte_at!).toLocaleDateString('fr-FR')} par ${esc(d.accepte_nom)}.</div>
      ${e1?.[0] && e1[0].statut !== 'paye' ? `<p class="noprint"><a class="btn" href="${lienPaiement(e1[0])}">Régler l'acompte</a></p>` : ''}`
  } else if (d.statut === 'annule' || d.statut === 'refuse') {
    bas = '<div class="etat" style="background:#f4ece6;border-color:#dccbbd">Ce devis n\'est plus valable. Contactez-nous pour une nouvelle proposition.</div>'
  } else if (expire(d)) {
    bas = `<div class="etat" style="background:#f4ece6;border-color:#dccbbd">Ce devis a expiré. Écrivez-nous à ${esc(AGENCE.email)} pour le renouveler.</div>`
  } else {
    bas = `<form class="accepter" method="post">
      <h2>Accepter le devis</h2>
      <label>Votre nom et prénom<br><input type="text" name="nom" required maxlength="120" autocomplete="name"></label>
      <label><input type="checkbox" name="cgv" required> J'ai lu et j'accepte les <a href="https://la-gabare.fr/cgv.html" target="_blank" rel="noopener">conditions générales de vente</a>
        et je commande les prestations ci-dessus pour ${euros(d.total_ttc_cents)}.</label>
      <button class="btn" type="submit">Accepter et régler l'acompte</button>
      <p class="muted" style="font-size:13px;color:#6b5f57;margin-top:12px">Une question avant d'accepter ? Répondez simplement au mail du devis.</p>
    </form>`
  }
  return page(`Devis ${d.numero}`, imprimer + htmlDevis(d, client) + bas)
}

// Acceptation : enregistre l'accord (nom, date, IP), crée l'échéancier et envoie vers le paiement de l'acompte
export async function POST(req: NextRequest, { params: paramsP }: { params: Promise<{ token: string }> }) {
  const params = await paramsP
  const r = await charger(String(params.token || ''))
  if (!r) return page('Devis introuvable', '<p>Ce lien de devis n\'est pas valide.</p>', 404)
  const { d, client } = r
  const form = await req.formData().catch(() => null)
  const nom = String(form?.get('nom') || '').trim().slice(0, 120)
  if (d.statut !== 'envoye' || expire(d)) return GET(req, { params: paramsP })
  if (!nom || form?.get('cgv') !== 'on') return page('Devis', '<p>Merci d\'indiquer votre nom et d\'accepter les conditions générales de vente.</p><p><a href="">Retour au devis</a></p>', 400)

  const { data: accepte } = await supabaseAdmin.from('devis')
    .update({ statut: 'accepte', accepte_at: new Date().toISOString(), accepte_nom: nom, accepte_ip: ipDe(req) })
    .eq('id', d.id).eq('statut', 'envoye').select().single()
  if (!accepte) return GET(req, { params: paramsP }) // double clic : déjà accepté

  // Le pack de la fiche suit le devis accepté (il décide des mois offerts, du mail d'accueil et des contenus à fournir)
  const packVendu = packDuDevis(d.lignes)
  if (packVendu) {
    const { data: fiche } = await supabaseAdmin.from('clients').select('pack_site').eq('id', d.client_id).single()
    if (String(fiche?.pack_site || '').toLowerCase() !== packVendu) {
      await supabaseAdmin.from('clients').update({ pack_site: packVendu }).eq('id', d.client_id)
      await notifier({ titre: `Pack de la fiche aligné sur le devis — ${client.nom_domaine}`, corps: `${fiche?.pack_site || 'aucun'} → ${packVendu} (devis ${d.numero})`, niveau: 'info', url: `https://admin.la-gabare.fr/clients/${d.client_id}` })
    }
  }

  // Échéancier du devis (on remplace un éventuel échéancier non commencé)
  const { data: actives } = await supabaseAdmin.from('echeances').select('id, statut').eq('client_id', d.client_id).neq('statut', 'annule')
  if (actives?.some((e) => e.statut === 'paye')) {
    console.error('devis accepté mais échéancier déjà entamé', d.id)
  } else {
    if (actives?.length) await supabaseAdmin.from('echeances').update({ statut: 'annule' }).in('id', actives.map((e) => e.id))
    const lignes = decouper(d.total_ttc_cents, d.formule).map((l) => ({ ...l, client_id: d.client_id }))
    const { error: errEch } = await supabaseAdmin.from('echeances').insert(lignes)
    if (errEch) console.error('devis acceptation: échéancier non créé', d.id, errEch.message)
  }
  await notifier({ titre: `Devis accepté — ${client.nom_domaine}`, corps: `${d.numero} · ${eurosCourt(d.total_ttc_cents)} TTC · accepté par ${nom}`, niveau: 'success', url: `https://admin.la-gabare.fr/clients/${d.client_id}`, id: `devis-accepte-${d.id}` })
  const { data: e1 } = await supabaseAdmin.from('echeances').select('*')
    .eq('client_id', d.client_id).eq('ordre', 1).neq('statut', 'annule').single()

  // Le lien de paiement doit marcher même si le mail échoue : on passe en « envoye » d'abord
  let e1Payable = e1
  if (e1 && e1.statut === 'a_venir') {
    const { error: errStatut } = await supabaseAdmin.from('echeances').update({ statut: 'envoye', envoye_at: new Date().toISOString() }).eq('id', e1.id)
    if (errStatut) console.error('devis acceptation: échéance non passée en envoye', d.id, errStatut.message)
    else e1Payable = { ...e1, statut: 'envoye' }
    try {
      await envoyerEcheance(e1 as Echeance)
    } catch (err) {
      console.error('devis acceptation: mail de l\'acompte non envoyé', d.id, err)
    }
  } else if (!e1) {
    console.error('devis accepté mais aucun acompte trouvé', d.id)
  }
  try {
    await sendMail(AGENCE.email, `Devis accepté — ${client.nom_domaine} · ${euros(d.total_ttc_cents)}`,
      `<p style="font-family:Arial,sans-serif;font-size:14px;">Le devis ${esc(d.numero)} a été accepté par ${esc(nom)} le ${new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}.
       Le lien de l'acompte lui a été envoyé.</p><p style="font-family:Arial,sans-serif;font-size:14px;"><a href="https://admin.la-gabare.fr/clients/${d.client_id}">Ouvrir la fiche client</a></p>`,
      { fromName: 'La Gabare — Devis' })
  } catch (err) {
    console.error('devis acceptation mails', err)
  }

  return e1Payable ? NextResponse.redirect(lienPaiement(e1Payable), 303) : GET(req, { params: paramsP })
}
