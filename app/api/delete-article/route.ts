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
    return withCors(
      NextResponse.json({ error: result.error }, { status: result.status })
    )
  }
  const { client } = result

  const { article_id } = await req.json()
  if (!article_id) {
    return withCors(
      NextResponse.json({ error: 'article_id is required' }, { status: 400 })
    )
  }

  // Vérifier que l'article appartient au client
  const { data: article, error: articleError } = await supabaseAdmin
    .from('articles_publications')
    .select('id')
    .eq('id', article_id)
    .eq('client_id', client.id)
    .single()

  if (articleError || !article) {
    return withCors(
      NextResponse.json(
        { error: 'Article not found or unauthorized' },
        { status: 404 }
      )
    )
  }

  // Supprimer l'article
  const { error } = await supabaseAdmin
    .from('articles_publications')
    .delete()
    .eq('id', article_id)
    .eq('client_id', client.id)

  if (error) {
    return withCors(
      NextResponse.json({ error: error.message }, { status: 400 })
    )
  }

  return withCors(NextResponse.json({ success: true }))
}
