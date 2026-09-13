import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getClientFromRequest } from '@/lib/auth-client'

export async function POST(req: NextRequest) {
  const result = await getClientFromRequest(req)
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  const { client } = result

  const { article_id } = await req.json()
  if (!article_id) {
    return NextResponse.json({ error: 'article_id is required' }, { status: 400 })
  }

  const { data: article } = await supabaseAdmin
    .from('articles')
    .select('id, client_id')
    .eq('id', article_id)
    .single()

  if (!article || article.client_id !== client.id) {
    return NextResponse.json({ error: 'Article not found for this client' }, { status: 404 })
  }

  const { data, error } = await supabaseAdmin
    .from('articles')
    .update({ plan_editorial_valide: true })
    .eq('id', article_id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json(data)
}
