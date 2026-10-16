import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { withCors, corsPreflight } from '@/lib/cors'

export async function OPTIONS() {
  return corsPreflight()
}

function egal(a: string, b: string) {
  if (a.length !== b.length) return false
  let r = 0
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return r === 0
}

// Appelé par l'admin PHP des sites clients (« Paramètres › Clé API La Gabare »).
// - Le client n'a pas encore de clé : la clé saisie est enregistrée (première mise en service).
// - Le client a déjà une clé : on vérifie seulement que la clé saisie est la bonne.
//   Une clé existante ne peut plus être remplacée depuis un site : seule l'agence la change (dashboard).
export async function POST(req: NextRequest) {
  const { domain, api_key } = await req.json().catch(() => ({}))

  if (!domain || !api_key || typeof api_key !== 'string' || api_key.length < 16 || api_key.length > 200) {
    return withCors(NextResponse.json({ error: 'domain et api_key (16 caractères minimum) sont requis' }, { status: 400 }))
  }

  const { data: client, error: clientError } = await supabaseAdmin
    .from('clients')
    .select('id, api_key')
    .eq('domaine', String(domain).toLowerCase())
    .single()

  if (clientError || !client) {
    return withCors(NextResponse.json({ error: 'Client not found' }, { status: 404 }))
  }

  if (client.api_key) {
    if (!egal(String(client.api_key), api_key)) {
      return withCors(NextResponse.json({ error: 'Clé API incorrecte' }, { status: 403 }))
    }
    return withCors(NextResponse.json({ success: true, message: 'Clé API vérifiée' }))
  }

  const { error } = await supabaseAdmin.from('clients').update({ api_key }).eq('id', client.id).is('api_key', null)
  if (error) {
    return withCors(NextResponse.json({ error: error.message }, { status: 400 }))
  }
  return withCors(NextResponse.json({ success: true, message: 'API key updated successfully' }))
}
