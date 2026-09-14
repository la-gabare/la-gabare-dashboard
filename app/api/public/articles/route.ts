import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { withCors, corsPreflight } from '@/lib/cors'

export async function OPTIONS() {
  return corsPreflight()
}

export async function GET(request: NextRequest) {
  const domaine = request.nextUrl.searchParams.get('domain')

  if (!domaine) {
    return withCors(NextResponse.json({ error: 'domain parameter required' }, { status: 400 }))
  }

  // Get client by domain
  const { data: client, error: clientError } = await supabaseAdmin
    .from('clients')
    .select('id')
    .eq('domaine', domaine)
    .single()

  if (clientError || !client) {
    return withCors(NextResponse.json({ publications: [] }))
  }

  // Get published articles
  const { data: publications, error } = await supabaseAdmin
    .from('articles_publications')
    .select('*')
    .eq('client_id', client.id)
    .eq('statut', 'publie')
    .order('date_publication', { ascending: false })

  if (error) {
    return withCors(NextResponse.json({ publications: [] }))
  }

  return withCors(NextResponse.json({ publications: publications || [] }))
}
