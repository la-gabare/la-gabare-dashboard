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

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const postId = formData.get('post_id') as string | null

  if (!file || !postId) {
    return withCors(NextResponse.json({ error: 'file and post_id are required' }, { status: 400 }))
  }

  const { data: post } = await supabaseAdmin
    .from('posts')
    .select('id, client_id')
    .eq('id', postId)
    .single()

  if (!post || post.client_id !== client.id) {
    return withCors(NextResponse.json({ error: 'Post not found for this client' }, { status: 404 }))
  }

  const ext = file.name.split('.').pop()
  const path = `clients/${client.id}/posts/${postId}-${Date.now()}.${ext}`
  const arrayBuffer = await file.arrayBuffer()

  const { error: uploadError } = await supabaseAdmin.storage
    .from('client-media')
    .upload(path, Buffer.from(arrayBuffer), { contentType: file.type })

  if (uploadError) {
    return withCors(NextResponse.json({ error: uploadError.message }, { status: 400 }))
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
