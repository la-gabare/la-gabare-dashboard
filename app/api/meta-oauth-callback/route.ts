import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

const REDIRECT_BASE = 'https://la-gabare.fr/espace-client.html'
const REDIRECT_URI = 'https://admin.la-gabare.fr/api/meta-oauth-callback'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const oauthError = searchParams.get('error')

  if (oauthError || !code || !state) {
    return NextResponse.redirect(`${REDIRECT_BASE}?social_connect=error`)
  }

  // Identify the client from the state param (their Supabase access token)
  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(state)
  if (userError || !userData.user?.email) {
    return NextResponse.redirect(`${REDIRECT_BASE}?social_connect=error`)
  }

  const { data: clients } = await supabaseAdmin
    .from('clients')
    .select('id')
    .eq('email_contact', userData.user.email)
    .order('created_at', { ascending: false })
    .limit(1)

  const client = clients?.[0]
  if (!client) {
    return NextResponse.redirect(`${REDIRECT_BASE}?social_connect=error`)
  }

  const igAppId = process.env.INSTAGRAM_APP_ID
  const igAppSecret = process.env.INSTAGRAM_APP_SECRET

  try {
    // 1. Exchange the authorization code for a short-lived Instagram user token
    // (Instagram's direct login token endpoint expects form-encoded POST, not query params)
    const formBody = new URLSearchParams({
      client_id: igAppId!,
      client_secret: igAppSecret!,
      grant_type: 'authorization_code',
      redirect_uri: REDIRECT_URI,
      code,
    })
    const tokenRes = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      body: formBody,
    })
    const tokenData = await tokenRes.json()
    if (!tokenData.access_token) {
      throw new Error(tokenData.error_message || 'No access token returned')
    }

    // 2. Exchange for a long-lived token (~60 days)
    const longRes = await fetch(
      `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${igAppSecret}&access_token=${tokenData.access_token}`
    )
    const longData = await longRes.json()
    const longLivedToken = longData.access_token || tokenData.access_token

    // 3. Store the connection. With direct Instagram Login there is no
    // Facebook Page involved — the Instagram Business account authenticates
    // on its own, so facebook_page_id stays null.
    await supabaseAdmin.from('client_social_accounts').delete().eq('client_id', client.id)
    await supabaseAdmin.from('client_social_accounts').insert({
      client_id: client.id,
      facebook_page_id: null,
      facebook_page_name: null,
      instagram_business_account_id: String(tokenData.user_id),
      access_token: longLivedToken,
      connected_at: new Date().toISOString(),
    })

    return NextResponse.redirect(`${REDIRECT_BASE}?social_connect=success`)
  } catch (err) {
    console.error('Instagram OAuth callback error:', err)
    return NextResponse.redirect(`${REDIRECT_BASE}?social_connect=error`)
  }
}
