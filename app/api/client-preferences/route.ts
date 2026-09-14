import { NextRequest, NextResponse } from 'next/server'
import { getClientFromRequest } from '@/lib/auth-client'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  try {
    const client = await getClientFromRequest(request)
    if (!client) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json({
      preferences: {
        notif_published: client.notif_published ?? true,
        notif_validation: client.notif_validation ?? true,
        notif_feedback: client.notif_feedback ?? true,
      }
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const client = await getClientFromRequest(request)
    if (!client) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { notif_published, notif_validation, notif_feedback } = await request.json()

    const { error } = await supabaseAdmin
      .from('clients')
      .update({
        notif_published: notif_published ?? true,
        notif_validation: notif_validation ?? true,
        notif_feedback: notif_feedback ?? true,
      })
      .eq('id', client.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
