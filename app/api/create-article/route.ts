import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { withCors, corsPreflight } from '@/lib/cors'

export async function OPTIONS() {
  return corsPreflight()
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('Authorization') || ''
  const body = await req.json()
  let clientId: number | null = null

  if (authHeader.startsWith('Bearer admin_')) {
    // Admin : cible le client passé dans le body, sinon 7 (Domaine Moreau) par défaut
    clientId = body.client_id ? Number(body.client_id) : 7
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

  const { titre, contenu, date_publication, slug, image_url } = body

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
      statut: 'publie'
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
