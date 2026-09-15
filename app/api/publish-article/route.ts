import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { withCors, corsPreflight } from '@/lib/cors'

export async function OPTIONS() {
  return corsPreflight()
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { domain, token, titre, contenu, slug, date_publication, image_url } = body

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

  // Créer l'article avec image_url optionnel
  const { data, error } = await supabaseAdmin
    .from('articles_publications')
    .insert({
      client_id: client.id,
      titre,
      contenu,
      slug,
      image_url: image_url || null,
      date_publication: date_publication || new Date().toISOString(),
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
