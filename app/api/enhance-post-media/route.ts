import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const maxDuration = 30

export async function POST(req: NextRequest) {
  const { post_id } = await req.json()

  if (!post_id) {
    return NextResponse.json({ error: 'post_id required' }, { status: 400 })
  }

  const { data: post } = await supabaseAdmin
    .from('posts')
    .select('id, client_id, media_url, format')
    .eq('id', post_id)
    .single()

  if (!post || !post.media_url) {
    return NextResponse.json({ error: 'Aucun média sur ce post' }, { status: 400 })
  }

  try {
    const sourceRes = await fetch(post.media_url)
    if (!sourceRes.ok) throw new Error('Impossible de récupérer la photo actuelle')
    const sourceBuffer = Buffer.from(await sourceRes.arrayBuffer())

    const [width, height] = post.format === 'story' ? [1080, 1920] : [1080, 1080]

    // Classic (non-generative) enhancement: normalize exposure/contrast,
    // sharpen detail, and lift saturation slightly — never touches content.
    const finalBuffer = await sharp(sourceBuffer)
      .resize(width, height, { fit: 'cover', position: 'centre' })
      .normalize()
      .modulate({ saturation: 1.15, brightness: 1.03 })
      .sharpen({ sigma: 1.2 })
      .jpeg({ quality: 92 })
      .toBuffer()

    const path = `clients/${post.client_id}/posts/${post.id}-${Date.now()}-enhanced.jpg`
    const { error: uploadError } = await supabaseAdmin.storage
      .from('client-media')
      .upload(path, finalBuffer, { contentType: 'image/jpeg' })

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 400 })
    }

    const { data: publicUrlData } = supabaseAdmin.storage.from('client-media').getPublicUrl(path)

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('posts')
      .update({ media_url: publicUrlData.publicUrl })
      .eq('id', post_id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 })
    }

    return NextResponse.json(updated)
  } catch (err) {
    console.error('Enhance post media error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erreur inconnue' }, { status: 500 })
  }
}
