import { NextRequest, NextResponse } from 'next/server'
import { getClientFromRequest } from '@/lib/auth-client'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { withCors, corsPreflight } from '@/lib/cors'
import { lienPaiement } from '@/lib/paiements/echeancier'
import { declencherVersement, notifierAgence } from '@/lib/paiements/projet'
import { listeContenus, contenusDuPack, manquants, EtatContenu } from '@/lib/contenus'

export const dynamic = 'force-dynamic'

export async function OPTIONS() {
  return corsPreflight()
}

const json = (data: unknown, status = 200) => withCors(NextResponse.json(data, { status }))
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))

// Espace client : avancement du projet de site (devis, versements, maquette, mise en ligne)
export async function GET(req: NextRequest) {
  const r = await getClientFromRequest(req)
  if (r.error || !r.client) return json({ error: r.error }, r.status || 401)
  const c = r.client
  const [{ data: echeances }, { data: devis }] = await Promise.all([
    supabaseAdmin.from('echeances').select('id, ordre, libelle, montant_cents, statut, token, paye_at')
      .eq('client_id', c.id).neq('statut', 'annule').order('ordre'),
    supabaseAdmin.from('devis').select('numero, statut, token, total_ttc_cents, accepte_at')
      .eq('client_id', c.id).in('statut', ['envoye', 'accepte']).order('created_at', { ascending: false }).limit(1),
  ])
  return json({
    pack_site: c.pack_site || null,
    devis: devis?.[0] ? { ...devis[0], lien: `https://admin.la-gabare.fr/api/public/devis/${devis[0].token}`, token: undefined } : null,
    versements: (echeances || []).map((e) => ({
      ordre: e.ordre, libelle: e.libelle, montant_cents: e.montant_cents, statut: e.statut, paye_at: e.paye_at,
      lien: e.statut === 'envoye' || e.statut === 'virement_en_attente' ? lienPaiement(e) : null,
    })),
    maquette: c.maquette_statut ? {
      url: c.maquette_url, statut: c.maquette_statut, commentaire: c.maquette_commentaire,
      soumise_at: c.maquette_soumise_at, validee_at: c.maquette_validee_at,
    } : null,
    site_url: c.mis_en_ligne_at ? c.site_url : null,
    mis_en_ligne_at: c.mis_en_ligne_at || null,
    // Checklist des contenus : affichée dès le mail d'accueil (premier paiement) et jusqu'à la mise en ligne
    contenus: c.accueil_envoye_at && !c.mis_en_ligne_at
      ? listeContenus(c).map(({ cle, libelle, aide, mode, etat }) => ({ cle, libelle, aide, mode, statut: etat?.statut || null, texte: etat?.texte || '' }))
      : null,
    contenus_limite: c.contenus_limite || null,
  })
}

export async function POST(req: NextRequest) {
  const r = await getClientFromRequest(req)
  if (r.error || !r.client) return json({ error: r.error }, r.status || 401)
  const c = r.client
  const body = await req.json().catch(() => ({}))

  // Un élément de la checklist fourni par le vigneron (texte saisi, ou « c'est envoyé »)
  if (body.action === 'contenu') {
    const def = contenusDuPack(c.pack_site).find((d) => d.cle === body.cle)
    if (!def) return json({ error: 'Élément inconnu.' }, 400)
    const texte = String(body.texte || '').trim().slice(0, 5000)
    if (def.mode === 'texte' && !texte) return json({ error: "Écrivez votre réponse avant de l'envoyer." }, 400)
    const etats: Record<string, EtatContenu> = { ...(c.contenus || {}) }
    if (etats[def.cle]?.statut === 'valide') return json({ error: 'Cet élément est déjà validé par notre équipe.' }, 400)
    etats[def.cle] = { statut: 'fourni', ...(texte ? { texte } : {}), fourni_at: new Date().toISOString() }
    await supabaseAdmin.from('clients').update({ contenus: etats }).eq('id', c.id)
    const reste = manquants({ pack_site: c.pack_site, contenus: etats })
    if (!reste.length) {
      await notifierAgence(`Contenus complets — ${c.nom_domaine}`,
        `<p>${esc(c.nom_domaine)} a fourni tous ses contenus : vous pouvez lancer la maquette.</p>
         <p><a href="https://admin.la-gabare.fr/clients/${c.id}">Ouvrir la fiche client</a></p>`)
    }
    return json({ ok: true, restants: reste.length })
  }

  if (c.maquette_statut !== 'a_valider') return json({ error: 'Aucune maquette en attente de validation.' }, 400)

  if (body.action === 'valider') {
    await supabaseAdmin.from('clients')
      .update({ maquette_statut: 'validee', maquette_validee_at: new Date().toISOString(), maquette_commentaire: null })
      .eq('id', c.id)
    let versement = null
    try { versement = await declencherVersement(c.id, 'maquette') } catch (e) { console.error('versement maquette', e) }
    await notifierAgence(`Maquette validée — ${c.nom_domaine}`,
      `<p>${esc(c.nom_domaine)} a validé sa maquette.${versement ? ` Le lien du versement « ${esc(versement.libelle)} » lui a été envoyé.` : ''}</p>
       <p><a href="https://admin.la-gabare.fr/clients/${c.id}">Ouvrir la fiche client</a></p>`)
    return json({ ok: true, versement_envoye: Boolean(versement) })
  }

  if (body.action === 'corrections') {
    const commentaire = String(body.commentaire || '').trim().slice(0, 5000)
    if (!commentaire) return json({ error: 'Décrivez les corrections souhaitées.' }, 400)
    await supabaseAdmin.from('clients').update({ maquette_statut: 'corrections', maquette_commentaire: commentaire }).eq('id', c.id)
    await notifierAgence(`Corrections demandées — ${c.nom_domaine}`,
      `<p>${esc(c.nom_domaine)} demande des corrections sur sa maquette :</p>
       <blockquote style="border-left:3px solid #B08D57;margin:0;padding:8px 12px;white-space:pre-wrap;">${esc(commentaire)}</blockquote>
       <p><a href="https://admin.la-gabare.fr/clients/${c.id}">Ouvrir la fiche client</a></p>`)
    return json({ ok: true })
  }

  return json({ error: 'Action inconnue' }, 400)
}
