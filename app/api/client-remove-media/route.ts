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

  const { post_id: postId } = await req.json()

  if (!postId) {
    return withCors(NextResponse.json({ error: 'post_id is required' }, { status: 400 }))
  }

  const { data: post } = await supabaseAdmin
    .from('posts')
    .select('id, client_id, status')
    .eq('id', postId)
    .single()

  if (!post || post.client_id !== client.id) {
    return withCors(NextResponse.json({ error: 'Post not found for this client' }, { status: 404 }))
  }

  if (post.status === 'publie') {
    return withCors(NextResponse.json({ error: 'Ce post est déjà publié, la photo ne peut plus être retirée.' }, { status: 400 }))
  }

  const { data: updated, error: updateError } = await supabaseAdmin
    .from('posts')
    .update({ media_url: null, status: 'brouillon' })
    .eq('id', postId)
    .select()
    .single()

  if (updateError) {
    return withCors(NextResponse.json({ error: updateError.message }, { status: 400 }))
  }

  return withCors(NextResponse.json(updated))
}
