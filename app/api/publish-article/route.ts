import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { withCors, corsPreflight } from '@/lib/cors'

export async function OPTIONS() {
  return corsPreflight()
}

export async function POST(req: NextRequest) {
  const { domain, token, titre, contenu, slug, image_url, date_publication } = await req.json()

  if (!domain || !token || !titre || !contenu || !slug) {
    return withCors(
      NextResponse.json(
        { error: 'domain, token, titre, contenu, and slug are required' },
        { status: 400 }
      )
    )
  }

  // Hardcoder pour Domaine Moreau
  let client = { id: 7, api_key: 'moreau2024' }

  // Vérifier le token
  if (token !== client.api_key) {
    return withCors(
      NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    )
  }

  // Créer l'article
  const { data, error } = await supabaseAdmin
    .from('articles_publications')
    .insert({
      client_id: client.id,
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
