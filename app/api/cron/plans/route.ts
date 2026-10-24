import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { lancerPlanEditorial } from '@/lib/plan-editorial'
import { notifier, nomClient, eurosCourt } from '@/lib/notifier'

export const dynamic = 'force-dynamic'

// Plan éditorial mensuel des abonnés actifs — appelé chaque jour par Vercel Cron (vercel.json) :
// un nouveau plan part 30 jours après le précédent, en suivant le rythme propre à chaque client.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }
  const { data: clients } = await supabaseAdmin.from('clients').select('id').eq('statut', 'actif').not('abonnement', 'is', null)
    .not('date_debut_abonnement', 'is', null) // abonnement réellement démarré (pas un client « site seul »)
  let lances = 0
  for (const c of clients || []) {
    if (await lancerPlanEditorial(c.id, 'mensuel', 30)) lances++
  }
  if (lances) await notifier({ titre: `${lances} plan(s) éditorial(aux) lancé(s)`, corps: 'Les agents du pôle Contenu peuvent les rédiger.', niveau: 'info', id: `plans-lances-${new Date().toISOString().slice(0, 10)}` })
  return NextResponse.json({ abonnes: clients?.length || 0, plans_lances: lances })
}
