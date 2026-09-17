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

  const { data } = await supabaseAdmin
    .from('client_google_accounts')
    .select('location_name, connected_at')
    .eq('client_id', client.id)
    .single()

  if (!data) {
    return withCors(NextResponse.json({ connected: false, account: null }))
  }

  return withCors(NextResponse.json({
    connected: true,
    account: {
      location_name: data.location_name,
      connected_at: data.connected_at,
    },
  }))
}
