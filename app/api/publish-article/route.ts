import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getClientFromRequest } from '@/lib/auth-client'
import { withCors, corsPreflight } from '@/lib/cors'

export async function OPTIONS() {
  return corsPreflight()
}

export async function POST(req: NextRequest) {
  const result = await getClientFromRequest(req)
  if ('error' in result) {
    return withCors(NextResponse.json({ error: result.error }, { status: result.status }))
  }
  const { client } = result

  const { article_id } = await req.json()
  if (!article_id) {
    return withCors(NextResponse.json({ error: 'article_id is required' }, { status: 400 }))
  }

  // Get article
  const { data: article, error: articleError } = await supabaseAdmin
    .from('articles')
    .select('*')
    .eq('id', article_id)
    .eq('client_id', client.id)
    .single()

  if (articleError || !article) {
    return withCors(NextResponse.json({ error: 'Article not found' }, { status: 404 }))
  }

  // Create slug from title
  const slug = article.titre
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  // Check if already published
  const { data: existingPub } = await supabaseAdmin
    .from('publications')
    .select('id')
    .eq('article_id', article_id)
    .single()

  if (existingPub) {
    return withCors(NextResponse.json({ error: 'Article already published' }, { status: 400 }))
  }

  // Create publication
  const { data: publication, error } = await supabaseAdmin
    .from('publications')
    .insert({
      client_id: client.id,
      titre: article.titre,
      contenu: article.contenu,
      slug: slug,
      statut: 'publie',
    })
    .select()
    .single()

  if (error) {
    return withCors(NextResponse.json({ error: error.message }, { status: 400 }))
  }

  return withCors(NextResponse.json({ success: true, publication }))
}
