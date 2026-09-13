import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getClientFromRequest } from '@/lib/auth-client'
import { withCors, corsPreflight } from '@/lib/cors'

export async function OPTIONS() {
  return corsPreflight()
}

export async function GET(req: NextRequest) {
  const result = await getClientFromRequest(req)
  if ('error' in result) {
    return withCors(NextResponse.json({ error: result.error }, { status: result.status }))
  }

  const { client } = result

  const [articlesRes, postsRes] = await Promise.all([
    supabaseAdmin.from('articles').select('*').eq('client_id', client.id).order('date_publication_prevue', { ascending: true }),
    supabaseAdmin.from('posts').select('*').eq('client_id', client.id).order('date_publication_prevue', { ascending: true }),
  ])

  return withCors(NextResponse.json({
    client,
    articles: articlesRes.data || [],
    posts: postsRes.data || [],
  }))
}
