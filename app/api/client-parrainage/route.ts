import { NextRequest, NextResponse } from 'next/server'
import { getClientFromRequest } from '@/lib/auth-client'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { withCors, corsPreflight } from '@/lib/cors'
import { codeParrainage, lienParrainage, PARRAINAGE } from '@/lib/parrainage'

export const dynamic = 'force-dynamic'

export async function OPTIONS() {
  return corsPreflight()
}

const json = (data: unknown, status = 200) => withCors(NextResponse.json(data, { status }))

// Espace client : lien de parrainage personnel et suivi des domaines recommandés
export async function GET(req: NextRequest) {
  const r = await getClientFromRequest(req)
  if (r.error || !r.client) return json({ error: r.error }, r.status || 401)
  const c = r.client
  if (c.statut !== 'actif') return json({ actif: false })
  try {
    const code = await codeParrainage(c)
    const { data: filleuls } = await supabaseAdmin.from('clients')
      .select('nom_domaine, parrainage_recompense_at').eq('parrain_id', c.id).order('created_at', { ascending: false })
    return json({
      actif: true,
      code,
      lien: lienParrainage(code),
      mois_offerts_filleul: PARRAINAGE.moisOffertsFilleul,
      filleuls: (filleuls || []).map((f) => ({ nom: f.nom_domaine, recompense: Boolean(f.parrainage_recompense_at) })),
    })
  } catch (e) {
    console.error('client-parrainage', e)
    return json({ error: 'Parrainage momentanément indisponible.' }, 500)
  }
}
