import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getClientFromRequest } from '@/lib/auth-client'
import { withCors, corsPreflight } from '@/lib/cors'

export async function OPTIONS() {
  return corsPreflight()
}

export async function POST(req: NextRequest) {
  // Vérifier le token Bearer
  const authHeader = req.headers.get('Authorization') || ''
  const referer = req.headers.get('referer') || ''
  let client

  if (authHeader.startsWith('Bearer admin_')) {
    // Token admin local depuis admin.html - mapper au client correct via le referer
    try {
      const domain = new URL(referer).hostname
      const { data: foundClient, error } = await supabaseAdmin
        .from('clients')
        .select('id, api_key')
        .eq('domain', domain)
        .single()

      if (error || !foundClient) {
        return withCors(
          NextResponse.json({ error: 'Client not found' }, { status: 404 })
        )
      }

      const token = authHeader.replace('Bearer admin_', '')
      if (token !== foundClient.api_key) {
        return withCors(
          NextResponse.json({ error: 'Invalid token' }, { status: 401 })
        )
      }

      client = foundClient
    } catch (e) {
      return withCors(
        NextResponse.json({ error: 'Invalid referer' }, { status: 400 })
      )
    }
  } else {
    // Token Supabase normal
    const result = await getClientFromRequest(req)
    if ('error' in result) {
      return withCors(
        NextResponse.json({ error: result.error }, { status: result.status })
      )
    }
    client = result.client
  }

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
