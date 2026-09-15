import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    const type = formData.get('type') as string // 'article' ou 'post'

    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier' }, { status: 400 })
    }

    const buffer = await file.arrayBuffer()
    const filename = `${type}/${Date.now()}_${file.name}`

    const { data, error } = await supabaseAdmin.storage
      .from('media')
      .upload(filename, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    const { data: publicUrl } = supabaseAdmin.storage
      .from('media')
      .getPublicUrl(filename)

    return NextResponse.json({
      url: publicUrl.publicUrl,
      filename: data.path,
    })
  } catch (err) {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
