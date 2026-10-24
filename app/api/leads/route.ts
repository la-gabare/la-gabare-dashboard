import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { notifier, nomClient, eurosCourt } from '@/lib/notifier'

export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { id, ...fields } = body

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('leads')
    .update(fields)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  if (fields.statut) {
    await notifier({ titre: `Lead — ${data.domaine || data.nom || `n° ${id}`} : ${String(fields.statut).replace(/_/g, ' ')}`, niveau: 'info', url: 'https://admin.la-gabare.fr/leads' })
  }
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 })
  }

  const { error } = await supabaseAdmin.from('leads').delete().eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  await notifier({ titre: `Lead n° ${id} supprimé`, niveau: 'warning', url: 'https://admin.la-gabare.fr/leads' })
  return NextResponse.json({ success: true })
}
