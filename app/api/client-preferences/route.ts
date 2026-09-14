import { NextRequest, NextResponse } from 'next/server'
import { getClientFromRequest } from '@/lib/auth-client'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { withCors, corsPreflight } from '@/lib/cors'

export async function OPTIONS() {
  return corsPreflight()
}

export async function GET(request: NextRequest) {
  try {
    const result = await getClientFromRequest(request)
    if (result.error || !result.client) {
      return withCors(NextResponse.json({ error: result.error || 'Unauthorized' }, { status: result.status || 401 }))
    }
    const client = result.client

    return withCors(NextResponse.json({
      preferences: {
        notif_published: client.notif_published ?? true,
        notif_validation: client.notif_validation ?? true,
        notif_feedback: client.notif_feedback ?? true,
      }
    }))
  } catch (err: any) {
    return withCors(NextResponse.json({ error: err.message }, { status: 500 }))
  }
}

export async function PUT(request: NextRequest) {
  try {
    const result = await getClientFromRequest(request)
    if (result.error || !result.client) {
      return withCors(NextResponse.json({ error: result.error || 'Unauthorized' }, { status: result.status || 401 }))
    }
    const client = result.client

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
      return withCors(NextResponse.json({ error: error.message }, { status: 400 }))
    }

    return withCors(NextResponse.json({ success: true }))
  } catch (err: any) {
    return withCors(NextResponse.json({ error: err.message }, { status: 500 }))
  }
}
