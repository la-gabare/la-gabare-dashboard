import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getClientFromRequest } from '@/lib/auth-client'
import { withCors, corsPreflight } from '@/lib/cors'

export async function OPTIONS() {
  return corsPreflight()
}

export async function GET(req: NextRequest) {
  const result = await getClientFromRequest(req)
  if ('error' in result) {
    return withCors(NextResponse.json({ error: result.error }, { status: result.status }))
  }
  const { client } = result

  const { data, error } = await supabaseAdmin
    .from('photos_galerie')
    .select('*')
    .eq('client_id', client.id)
    .order('created_at', { ascending: false })

  if (error) {
    return withCors(NextResponse.json({ error: error.message }, { status: 400 }))
  }

  return withCors(NextResponse.json({ photos: data || [] }))
}

export async function POST(req: NextRequest) {
  const result = await getClientFromRequest(req)
  if ('error' in result) {
    return withCors(NextResponse.json({ error: result.error }, { status: result.status }))
  }
  const { client } = result

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const angle = formData.get('angle') as string | null

  if (!file || !angle) {
    return withCors(NextResponse.json({ error: 'file and angle are required' }, { status: 400 }))
  }

  const ext = file.name.split('.').pop()
  const path = `clients/${client.id}/galerie/${angle}-${Date.now()}.${ext}`
  const arrayBuffer = await file.arrayBuffer()

  const { error: uploadError } = await supabaseAdmin.storage
    .from('client-media')
    .upload(path, Buffer.from(arrayBuffer), { contentType: file.type })

  if (uploadError) {
    return withCors(NextResponse.json({ error: uploadError.message }, { status: 400 }))
  }

  const { data: publicUrlData } = supabaseAdmin.storage.from('client-media').getPublicUrl(path)

  const { data, error } = await supabaseAdmin
    .from('photos_galerie')
    .insert({ client_id: client.id, angle, image_url: publicUrlData.publicUrl })
    .select()
    .single()

  if (error) {
    return withCors(NextResponse.json({ error: error.message }, { status: 400 }))
  }

  return withCors(NextResponse.json(data))
}

export async function DELETE(req: NextRequest) {
  const result = await getClientFromRequest(req)
  if ('error' in result) {
    return withCors(NextResponse.json({ error: result.error }, { status: result.status }))
  }
  const { client } = result

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  if (!id) {
    return withCors(NextResponse.json({ error: 'id is required' }, { status: 400 }))
  }

  const { error } = await supabaseAdmin
    .from('photos_galerie')
    .delete()
    .eq('id', id)
    .eq('client_id', client.id)

  if (error) {
    return withCors(NextResponse.json({ error: error.message }, { status: 400 }))
  }

  return withCors(NextResponse.json({ success: true }))
}
