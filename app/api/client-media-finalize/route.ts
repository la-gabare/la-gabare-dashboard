import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getClientFromRequest } from '@/lib/auth-client'
import { withCors, corsPreflight } from '@/lib/cors'

export async function OPTIONS() {
  return corsPreflight()
}

// Called after the browser finishes a direct-to-storage upload (see
// client-media-init) to point the post at the uploaded file.
export async function POST(req: NextRequest) {
  const result = await getClientFromRequest(req)
  if ('error' in result) {
    return withCors(NextResponse.json({ error: result.error }, { status: result.status }))
  }
  const { client } = result

  const { post_id: postId, path } = await req.json()

  if (!postId || !path) {
    return withCors(NextResponse.json({ error: 'post_id and path are required' }, { status: 400 }))
  }

  const { data: post } = await supabaseAdmin
    .from('posts')
    .select('id, client_id')
    .eq('id', postId)
    .single()

  if (!post || post.client_id !== client.id) {
    return withCors(NextResponse.json({ error: 'Post not found for this client' }, { status: 404 }))
  }

  const { data: publicUrlData } = supabaseAdmin.storage.from('client-media').getPublicUrl(path)

  const { data: updated, error: updateError } = await supabaseAdmin
    .from('posts')
    .update({ media_url: publicUrlData.publicUrl, status: 'media_recu' })
    .eq('id', postId)
    .select()
    .single()

  if (updateError) {
    return withCors(NextResponse.json({ error: updateError.message }, { status: 400 }))
  }

  return withCors(NextResponse.json(updated))
}
