import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getClientFromRequest } from '@/lib/auth-client'
import { withCors, corsPreflight } from '@/lib/cors'
import { notifier } from '@/lib/notifier'

export async function OPTIONS() {
  return corsPreflight()
}

// Le client valide un post depuis son espace : c'est cette validation qui le programme.
// Seul le cron de publication programmée (et le bouton Publier du client) envoient sur Instagram.
export async function POST(req: NextRequest) {
  const result = await getClientFromRequest(req)
  if ('error' in result) {
    return withCors(NextResponse.json({ error: result.error }, { status: result.status }))
  }
  const { client } = result

  const { post_id } = await req.json()
  if (!post_id) {
    return withCors(NextResponse.json({ error: 'post_id is required' }, { status: 400 }))
  }

  const { data: post } = await supabaseAdmin
    .from('posts')
    .select('id, client_id, media_url, status, date_publication_prevue')
    .eq('id', post_id)
    .single()

  if (!post || post.client_id !== client.id) {
    return withCors(NextResponse.json({ error: 'Post not found for this client' }, { status: 404 }))
  }
  if (post.status === 'publie') {
    return withCors(NextResponse.json({ error: 'Ce post est déjà publié.' }, { status: 400 }))
  }
  if (!post.media_url) {
    return withCors(NextResponse.json({ error: "Envoyez d'abord une photo ou une vidéo pour ce post." }, { status: 400 }))
  }

  const { data: compte } = await supabaseAdmin
    .from('client_social_accounts')
    .select('client_id')
    .eq('client_id', client.id)
    .maybeSingle()
  if (!compte) {
    return withCors(NextResponse.json({ error: "Connectez d'abord votre compte Instagram." }, { status: 400 }))
  }

  const { data, error } = await supabaseAdmin
    .from('posts')
    .update({ status: 'programme' })
    .eq('id', post_id)
    .select()
    .single()

  if (error) {
    return withCors(NextResponse.json({ error: error.message }, { status: 400 }))
  }

  await notifier({ titre: `Post validé et programmé par le vigneron — ${client.nom_domaine}`, corps: post.date_publication_prevue || 'Date à confirmer', niveau: 'success', url: `https://admin.la-gabare.fr/clients/${client.id}`, id: `post-programme-${post_id}` })
  return withCors(NextResponse.json(data))
}
