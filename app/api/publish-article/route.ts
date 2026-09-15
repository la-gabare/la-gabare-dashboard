import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { withCors, corsPreflight } from '@/lib/cors'

export async function OPTIONS() {
  return corsPreflight()
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { article_id } = body

    if (!article_id) {
      return withCors(NextResponse.json({ error: 'article_id required' }, { status: 400 }))
    }

    // Convert article_id to number if it's a string
    const id = typeof article_id === 'string' ? parseInt(article_id, 10) : article_id

    const { data: article } = await supabaseAdmin
      .from('articles')
      .select('id, angle, client_id, image_url')
      .eq('id', id)
      .single()

    if (!article) {
      return withCors(NextResponse.json({ error: 'Article not found' }, { status: 404 }))
    }

    const fields: { status: string; image_url?: string } = { status: 'publie' }

    // If the article has no image yet, pick a random photo from the client's
    // gallery album matching the article's angle
    if (!article.image_url && article.angle) {
      const { data: photos } = await supabaseAdmin
        .from('photos_galerie')
        .select('image_url')
        .eq('client_id', article.client_id)
        .eq('angle', article.angle)

      if (photos && photos.length > 0) {
        fields.image_url = photos[Math.floor(Math.random() * photos.length)].image_url
      }
    }

    // Update status to 'publie'
    const { data: updated, error: updateError, count } = await supabaseAdmin
      .from('articles')
      .update(fields)
      .eq('id', id)
      .select()

    if (updateError) {
      console.error('Publish article error:', updateError)
      return withCors(NextResponse.json({ error: updateError.message }, { status: 400 }))
    }

    if (!updated || updated.length === 0) {
      return withCors(NextResponse.json({ error: 'Article not found' }, { status: 404 }))
    }

    return withCors(NextResponse.json({ success: true, article: updated[0] }))
  } catch (err) {
    console.error('Publish article exception:', err)
    return withCors(NextResponse.json({
      error: `Server error: ${err instanceof Error ? err.message : 'Unknown'}`
    }, { status: 500 }))
  }
}
