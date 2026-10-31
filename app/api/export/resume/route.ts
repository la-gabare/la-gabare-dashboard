import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { chargerADecider } from '@/lib/a-decider'

export const dynamic = 'force-dynamic'

// Résumé en LECTURE SEULE pour Harness Maxxing (widget, agents Pilotage) : chiffres clés, sans e-mail ni téléphone.
// Protégé par le jeton ADMIN_API_TOKEN (Authorization: Bearer …), saisi par l'utilisateur dans Vercel.
function jetonValide(req: NextRequest) {
  const attendu = process.env.ADMIN_API_TOKEN
  const recu = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
  if (!attendu || attendu.length < 24 || !recu) return false
  const h = (x: string) => crypto.createHash('sha256').update(x).digest()
  return crypto.timingSafeEqual(h(recu), h(attendu))
}

export async function GET(req: NextRequest) {
  if (!jetonValide(req)) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const a_decider = await chargerADecider().catch(() => [])
  const il_y_a_7j = new Date(Date.now() - 7 * 86400000).toISOString()
  const [leads, leadsNouveaux, clients, devis, echeances, erreurs] = await Promise.all([
    supabaseAdmin.from('leads').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('leads').select('id, nom, domaine, statut, created_at').gte('created_at', il_y_a_7j).order('created_at', { ascending: false }).limit(10),
    supabaseAdmin.from('clients').select('statut'),
    supabaseAdmin.from('devis').select('id, client_id, statut').eq('statut', 'envoye'),
    supabaseAdmin.from('echeances').select('id, client_id, libelle, montant_cents, statut, envoye_at, relances').in('statut', ['envoye', 'virement_en_attente']),
    supabaseAdmin.from('erreurs').select('message, occurrences, derniere_at').gte('derniere_at', il_y_a_7j).order('derniere_at', { ascending: false }).limit(5),
  ])

  const parStatut: Record<string, number> = {}
  for (const c of (clients.data || []) as { statut: string | null }[]) {
    const k = c.statut || 'inconnu'
    parStatut[k] = (parStatut[k] || 0) + 1
  }
  const versements = (echeances.data || []) as { montant_cents: number }[]
  return NextResponse.json({
    genere_at: new Date().toISOString(),
    leads: { total: leads.count ?? null, derniers_7_jours: leadsNouveaux.data || [] },
    clients: { par_statut: parStatut },
    a_decider,
    devis_en_attente: (devis.data || []).length,
    versements_en_attente: { nombre: versements.length, total_cents: versements.reduce((s, e) => s + (e.montant_cents || 0), 0), liste: echeances.data || [] },
    erreurs_7_jours: (erreurs.data || []).map((e: { message: string; occurrences: number; derniere_at: string }) => ({ ...e, message: String(e.message).split('\n')[0].slice(0, 160) })),
  })
}
