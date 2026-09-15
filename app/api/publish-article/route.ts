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

  // Trouver le client par domaine (insensible à la casse)
  const { data: client, error: clientError } = await supabaseAdmin
    .from('clients')
    .select('id, api_key')
    .ilike('domain', domain)
    .single()

  if (clientError || !client) {
    return withCors(
      NextResponse.json({ error: 'Client not found' }, { status: 404 })
    )
  }

  // Vérifier le token (doit être l'api_key du client)
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
