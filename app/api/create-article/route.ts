import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { withCors, corsPreflight } from '@/lib/cors'

export async function OPTIONS() {
  return corsPreflight()
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('Authorization') || ''
  let clientId = null

  if (authHeader.startsWith('Bearer admin_')) {
    clientId = 7 // Domaine Moreau
  } else if (authHeader.startsWith('Bearer ')) {
    // Supabase token - à implémenter si besoin
    return withCors(
      NextResponse.json({ error: 'not implemented' }, { status: 501 })
    )
  } else {
    return withCors(
      NextResponse.json({ error: 'missing authorization' }, { status: 401 })
    )
  }

  const { titre, contenu, date_publication, slug, image_url } = await req.json()

  if (!titre || !contenu || !slug) {
    return withCors(
      NextResponse.json(
        { error: 'titre, contenu, and slug are required' },
        { status: 400 }
      )
    )
  }

  // Créer l'article
  const { data, error } = await supabaseAdmin
    .from('articles_publications')
    .insert({
      client_id: clientId,
      titre,
      contenu,
      slug,
      date_publication: date_publication || new Date().toISOString(),
      image_url,
      statut: 'publié'
    })
    .select('id, slug, date_publication')
    .single()

  if (error) {
    return withCors(
      NextResponse.json({ error: error.message }, { status: 400 })
    )
  }

  return withCors(
    NextResponse.json({
      success: true,
      article: data
    })
  )
}
