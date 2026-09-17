import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { publishPostToMeta } from '@/lib/meta-publish'

// Admin-side equivalent of /api/publish-post: lets the agency publish a
// client's post on their behalf from the dashboard, without a client session.
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { post_id } = body

  if (!post_id) {
    return NextResponse.json({ error: 'post_id required' }, { status: 400 })
  }

  const { data: post } = await supabaseAdmin
    .from('posts')
    .select('*')
    .eq('id', post_id)
    .single()

  if (!post) {
    return NextResponse.json({ error: 'Post introuvable' }, { status: 404 })
  }

  if (!post.media_url) {
    return NextResponse.json({ error: 'Aucun média envoyé pour ce post' }, { status: 400 })
  }

  const { data: account } = await supabaseAdmin
    .from('client_social_accounts')
    .select('instagram_business_account_id, facebook_page_id, access_token')
    .eq('client_id', post.client_id)
    .single()

  if (!account) {
    return NextResponse.json({
      error: 'Aucun compte Facebook/Instagram connecté pour ce client.'
    }, { status: 400 })
  }

  try {
    await publishPostToMeta(account, post)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    if (message === 'PROCESSING') {
      return NextResponse.json({
        error: 'Le média est encore en cours de traitement par Instagram. Réessayez dans une minute.'
      }, { status: 202 })
    }
    console.error('Admin publish post to Meta error:', err)
    return NextResponse.json({ error: message }, { status: 400 })
  }

  const { data: updated, error: updateError } = await supabaseAdmin
    .from('posts')
    .update({ status: 'publie', date_publication_reelle: new Date().toISOString() })
    .eq('id', post_id)
    .select()
    .single()

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 })
  }

  return NextResponse.json({ success: true, post: updated })
}
