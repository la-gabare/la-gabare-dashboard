import { NextRequest, NextResponse } from 'next/server'
import { getClientFromRequest } from '@/lib/auth-client'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { withCors, corsPreflight } from '@/lib/cors'

export async function OPTIONS() {
  return corsPreflight()
}

export async function POST(request: NextRequest) {
  try {
    const result = await getClientFromRequest(request)
    if (result.error || !result.client) {
      return withCors(NextResponse.json({ error: result.error || 'Unauthorized' }, { status: result.status || 401 }))
    }
    const client = result.client

    const { new_password } = await request.json()

    if (!new_password || new_password.length < 8) {
      return withCors(NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      ))
    }

    const { error } = await supabaseAdmin.auth.admin.updateUserById(client.user_id, {
      password: new_password,
    })

    if (error) {
      return withCors(NextResponse.json({ error: error.message }, { status: 400 }))
    }

    return withCors(NextResponse.json({ success: true }))
  } catch (err: any) {
    return withCors(NextResponse.json({ error: err.message }, { status: 500 }))
  }
}
