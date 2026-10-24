import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { envoyerMailHebdo } from '@/lib/mails-contenu'

// Seuls ces champs sont acceptés (le corps brut n'est plus écrit tel quel en base)
const CHAMPS = ['client_id', 'date_debut', 'date_fin', 'status', 'error_message'] as const
function filtrer(body: Record<string, unknown>) {
  return Object.fromEntries(CHAMPS.filter((c) => c in body).map((c) => [c, body[c]]))
}

export async function POST(req: NextRequest) {
  const body = filtrer(await req.json().catch(() => ({})))
  if (!body.client_id) return NextResponse.json({ error: 'client_id is required' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('mail_hebdo_requests')
    .insert([{ status: 'en_attente', ...body }])
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  // Envoi immédiat (avant : traité par n8n toutes les 15 minutes)
  await envoyerMailHebdo(data.id)
  const { data: apres } = await supabaseAdmin.from('mail_hebdo_requests').select('*').eq('id', data.id).single()
  return NextResponse.json(apres || data)
}

export async function PATCH(req: NextRequest) {
  const { id, ...reste } = await req.json().catch(() => ({}))
  const fields = filtrer(reste)

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('mail_hebdo_requests')
    .update(fields)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json(data)
}
