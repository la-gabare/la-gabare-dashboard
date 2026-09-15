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

  // Get published articles from both tables
  const [adminRes, clientRes] = await Promise.all([
    // Admin-created articles
    supabaseAdmin
      .from('articles')
      .select('id, titre, angle, contenu, date_publication, status, client_id')
      .eq('client_id', client.id)
      .eq('status', 'publie'),
    // Client-created articles
    supabaseAdmin
      .from('articles_publications')
      .select('*')
      .eq('client_id', client.id)
      .eq('statut', 'publie'),
  ])

  const adminArticles = adminRes.data || []
  const clientArticles = clientRes.data || []

  // Combine and sort by date
  const publications = [...adminArticles, ...clientArticles]
    .sort((a, b) => {
      const dateA = new Date(a.date_publication || 0).getTime()
      const dateB = new Date(b.date_publication || 0).getTime()
      return dateB - dateA
    })

  return withCors(NextResponse.json({ publications }))
}
