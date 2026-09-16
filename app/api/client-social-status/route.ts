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
    .from('client_social_accounts')
    .select('facebook_page_name, instagram_business_account_id, access_token, connected_at')
    .eq('client_id', client.id)
    .single()

  if (!data) {
    return withCors(NextResponse.json({ connected: false, account: null }))
  }

  let instagram_username: string | null = null
  let instagram_profile_picture_url: string | null = null
  let debug: unknown = null

  if (data.instagram_business_account_id) {
    try {
      const igRes = await fetch(
        `https://graph.instagram.com/v21.0/me?fields=username,profile_picture_url&access_token=${data.access_token}`
      )
      const igData = await igRes.json()
      instagram_username = igData.username || null
      instagram_profile_picture_url = igData.profile_picture_url || null
      if (!igRes.ok || igData.error) debug = igData
    } catch (err) {
      debug = { catchError: err instanceof Error ? err.message : String(err) }
    }
  } else {
    debug = { note: 'no instagram_business_account_id stored' }
  }

  return withCors(NextResponse.json({
    connected: true,
    account: {
      facebook_page_name: data.facebook_page_name,
      instagram_username,
      instagram_profile_picture_url,
      connected_at: data.connected_at,
    },
    debug,
  }))
}
