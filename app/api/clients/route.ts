import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(req: NextRequest) {
  const body = await req.json()

  const { data, error } = await supabaseAdmin
    .from('clients')
    .insert([body])
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  if (data.email_contact) {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://admin.la-gabare.fr'
    await supabaseAdmin.auth.admin.inviteUserByEmail(data.email_contact, {
      redirectTo: `${siteUrl}/mon-espace`,
    })
  }

  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { id, ...fields } = body

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('clients')
    .update(fields)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json(data)
}
