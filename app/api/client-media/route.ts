import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
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

  const isImage = file.type.startsWith('image/')
  const arrayBuffer = await file.arrayBuffer()

  // Instagram's Content Publishing API only accepts JPEG for image_url, so
  // every image is normalized to JPEG regardless of what the client uploads.
  let uploadBuffer = Buffer.from(arrayBuffer)
  let contentType = file.type
  let ext = file.name.split('.').pop()

  if (isImage && file.type !== 'image/jpeg') {
    uploadBuffer = await sharp(uploadBuffer).jpeg({ quality: 90 }).toBuffer()
    contentType = 'image/jpeg'
    ext = 'jpg'
  }

  const path = `clients/${client.id}/posts/${postId}-${Date.now()}.${ext}`

  const { error: uploadError } = await supabaseAdmin.storage
    .from('client-media')
    .upload(path, uploadBuffer, { contentType })

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
