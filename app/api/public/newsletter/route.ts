import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { withCors, corsPreflight } from '@/lib/cors'
import { clientParDomaine } from '@/lib/boutique/core'
import { texte, emailValide, tropDeRequetes, ipDe } from '@/lib/leads/public'
import { notifier, nomClient, eurosCourt } from '@/lib/notifier'

export const dynamic = 'force-dynamic'

export async function OPTIONS() {
  return corsPreflight()
}

function json(data: unknown, status = 200) {
  return withCors(NextResponse.json(data, { status }))
}

// Inscription / désinscription à la newsletter d'un domaine, depuis son site (subscribe.php, desinscription.php)
// Alimente la liste newsletter_abonnes utilisée par le workflow d'envoi des newsletters.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({} as Record<string, unknown>))
  if (body.site_web) return json({ ok: true })
  if (await tropDeRequetes(ipDe(req), 20)) return json({ error: 'Trop de demandes, réessayez plus tard.' }, 429)

  const email = (texte(body.email, 200) || '').toLowerCase()
  if (!emailValide(email)) return json({ error: 'Adresse e-mail invalide.' }, 400)
  const client = await clientParDomaine(String(body.domain || ''))
  if (!client) return json({ error: 'Site inconnu.' }, 404)

  if (body.action === 'desinscription') {
    await supabaseAdmin.from('newsletter_abonnes').delete().eq('client_id', client.id).ilike('email', email)
    await notifier({ titre: `Désinscription newsletter — ${client.nom_domaine || client.id}`, niveau: 'info' })
    return json({ ok: true })
  }

  const { data: existe } = await supabaseAdmin.from('newsletter_abonnes')
    .select('id').eq('client_id', client.id).ilike('email', email).limit(1)
  if (!existe?.length) {
    const { error } = await supabaseAdmin.from('newsletter_abonnes')
      .insert({ client_id: client.id, email, nom: texte(body.nom, 120) })
    if (error) {
      console.error('public/newsletter', error)
      return json({ error: 'Inscription impossible pour le moment.' }, 500)
    }
  }
  await notifier({ titre: `Nouvel abonné newsletter — ${client.nom_domaine || client.id}`, niveau: 'info', url: 'https://admin.la-gabare.fr/newsletters' })
  return json({ ok: true })
}
