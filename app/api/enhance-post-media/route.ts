import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const maxDuration = 60

const ENHANCE_PROMPT =
  'enhance photo quality, sharp focus, natural balanced lighting, vibrant realistic colors, high detail, professional photography, same subject and composition, no changes to content'

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

  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
  const apiToken = process.env.CLOUDFLARE_API_TOKEN
  if (!accountId || !apiToken) {
    return NextResponse.json({ error: 'Cloudflare non configuré' }, { status: 500 })
  }

  try {
    const sourceRes = await fetch(post.media_url)
    if (!sourceRes.ok) throw new Error('Impossible de récupérer la photo actuelle')
    const sourceBuffer = Buffer.from(await sourceRes.arrayBuffer())
    const sourcePixels = Array.from(await sharp(sourceBuffer).jpeg().toBuffer())

    const cfRes = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/runwayml/stable-diffusion-v1-5-img2img`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: ENHANCE_PROMPT,
          image: sourcePixels,
          strength: 0.25,
          num_steps: 20,
        }),
      }
    )

    if (!cfRes.ok) {
      throw new Error(`Cloudflare AI error: ${await cfRes.text()}`)
    }

    let enhancedBuffer: Buffer
    const contentType = cfRes.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      const data = await cfRes.json()
      const b64 = data.result?.image || data.result
      if (!b64) throw new Error('Réponse Cloudflare sans image')
      enhancedBuffer = Buffer.from(b64, 'base64')
    } else {
      enhancedBuffer = Buffer.from(await cfRes.arrayBuffer())
    }

    const [width, height] = post.format === 'story' ? [1080, 1920] : [1080, 1080]
    const finalBuffer = await sharp(enhancedBuffer)
      .resize(width, height, { fit: 'cover', position: 'centre' })
      .jpeg({ quality: 90 })
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
