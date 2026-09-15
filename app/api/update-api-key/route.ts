import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { withCors, corsPreflight } from '@/lib/cors'

export async function OPTIONS() {
  return corsPreflight()
}

export async function POST(req: NextRequest) {
  const { domain, api_key } = await req.json()

  if (!domain || !api_key) {
    return withCors(
      NextResponse.json(
        { error: 'domain and api_key are required' },
        { status: 400 }
      )
    )
  }

  // Trouver le client par domaine exact
  const { data: client, error: clientError } = await supabaseAdmin
    .from('clients')
    .select('id')
    .eq('domain', domain.toLowerCase())
    .single()

  if (clientError || !client) {
    return withCors(
      NextResponse.json({ error: 'Client not found' }, { status: 404 })
    )
  }

  // Mettre à jour la clé API
  const { error } = await supabaseAdmin
    .from('clients')
    .update({ api_key })
    .eq('id', client.id)

  if (error) {
    return withCors(
      NextResponse.json({ error: error.message }, { status: 400 })
    )
  }

  return withCors(
    NextResponse.json({
      success: true,
      message: 'API key updated successfully'
    })
  )
}
