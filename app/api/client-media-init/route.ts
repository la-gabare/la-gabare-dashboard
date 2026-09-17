import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getClientFromRequest } from '@/lib/auth-client'
import { withCors, corsPreflight } from '@/lib/cors'

export async function OPTIONS() {
  return corsPreflight()
}

// Issues a Supabase signed upload URL so the browser can upload large video
// files directly to storage, bypassing the ~4.5MB request body limit on
// Vercel serverless functions that a multipart POST here would hit.
export async function POST(req: NextRequest) {
  const result = await getClientFromRequest(req)
  if ('error' in result) {
    return withCors(NextResponse.json({ error: result.error }, { status: result.status }))
  }
  const { client } = result

  const { post_id: postId, filename } = await req.json()

  if (!postId || !filename) {
    return withCors(NextResponse.json({ error: 'post_id and filename are required' }, { status: 400 }))
  }

  const { data: post } = await supabaseAdmin
    .from('posts')
    .select('id, client_id')
    .eq('id', postId)
    .single()

  if (!post || post.client_id !== client.id) {
    return withCors(NextResponse.json({ error: 'Post not found for this client' }, { status: 404 }))
  }

  const ext = filename.split('.').pop() || 'mp4'
  const path = `clients/${client.id}/posts/${postId}-${Date.now()}.${ext}`

  const { data, error } = await supabaseAdmin.storage
    .from('client-media')
    .createSignedUploadUrl(path)

  if (error) {
    return withCors(NextResponse.json({ error: error.message }, { status: 400 }))
  }

  return withCors(NextResponse.json({ path: data.path, token: data.token }))
}
