import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getClientFromRequest } from '@/lib/auth-client'
import { withCors, corsPreflight } from '@/lib/cors'
import { publishPostToMeta } from '@/lib/meta-publish'

// Publishing polls Instagram's media processing status before calling
// media_publish, which can take longer than the platform's default timeout.
export const maxDuration = 60

export async function OPTIONS() {
  return corsPreflight()
}

export async function POST(req: NextRequest) {
  const result = await getClientFromRequest(req)
  if ('error' in result) {
    return withCors(NextResponse.json({ error: result.error }, { status: result.status }))
  }
  const { client } = result

  const body = await req.json()
  const { post_id } = body

  if (!post_id) {
    return withCors(NextResponse.json({ error: 'post_id required' }, { status: 400 }))
  }

  const { data: post } = await supabaseAdmin
    .from('posts')
    .select('*')
    .eq('id', post_id)
    .single()

  if (!post || post.client_id !== client.id) {
    return withCors(NextResponse.json({ error: 'Post not found for this client' }, { status: 404 }))
  }

  if (!post.media_url) {
    return withCors(NextResponse.json({ error: 'Aucun média envoyé pour ce post' }, { status: 400 }))
  }

  const { data: account } = await supabaseAdmin
    .from('client_social_accounts')
    .select('instagram_business_account_id, facebook_page_id, access_token')
    .eq('client_id', client.id)
    .single()

  if (!account) {
    return withCors(NextResponse.json({
      error: 'Aucun compte Facebook/Instagram connecté. Connectez-le depuis Paramètres.'
    }, { status: 400 }))
  }

  try {
    await publishPostToMeta(account, post)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    if (message === 'PROCESSING') {
      return withCors(NextResponse.json({
        error: 'La vidéo est encore en cours de traitement par Instagram. Réessayez dans une minute.'
      }, { status: 202 }))
    }
    console.error('Publish post to Meta error:', err)
    return withCors(NextResponse.json({ error: message }, { status: 400 }))
  }

  const { data: updated, error: updateError } = await supabaseAdmin
    .from('posts')
    .update({ status: 'publie', date_publication_reelle: new Date().toISOString() })
    .eq('id', post_id)
    .select()
    .single()

  if (updateError) {
    return withCors(NextResponse.json({ error: updateError.message }, { status: 400 }))
  }

  return withCors(NextResponse.json({ success: true, post: updated }))
}
