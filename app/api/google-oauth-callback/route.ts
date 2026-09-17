import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

const REDIRECT_BASE = 'https://la-gabare.fr/espace-client.html'
const REDIRECT_URI = 'https://admin.la-gabare.fr/api/google-oauth-callback'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const oauthError = searchParams.get('error')

  if (oauthError || !code || !state) {
    return NextResponse.redirect(`${REDIRECT_BASE}?google_connect=error`)
  }

  // Identify the client from the state param (their Supabase access token)
  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(state)
  if (userError || !userData.user?.email) {
    return NextResponse.redirect(`${REDIRECT_BASE}?google_connect=error`)
  }

  const { data: clients } = await supabaseAdmin
    .from('clients')
    .select('id')
    .eq('email_contact', userData.user.email)
    .order('created_at', { ascending: false })
    .limit(1)

  const client = clients?.[0]
  if (!client) {
    return NextResponse.redirect(`${REDIRECT_BASE}?google_connect=error`)
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET

  try {
    // 1. Exchange the authorization code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId!,
        client_secret: clientSecret!,
        code,
        grant_type: 'authorization_code',
        redirect_uri: REDIRECT_URI,
      }),
    })
    const tokenData = await tokenRes.json()
    if (!tokenData.access_token) {
      throw new Error(tokenData.error_description || 'No access token returned')
    }

    // 2. Find which Business Profile account/location this Google login manages
    const accountsRes = await fetch(
      'https://mybusinessaccountmanagement.googleapis.com/v1/accounts',
      { headers: { Authorization: `Bearer ${tokenData.access_token}` } }
    )
    const accountsData = await accountsRes.json()
    const googleAccountId = accountsData.accounts?.[0]?.name || null

    let locationId: string | null = null
    let locationName: string | null = null
    if (googleAccountId) {
      const locRes = await fetch(
        `https://mybusinessbusinessinformation.googleapis.com/v1/${googleAccountId}/locations?readMask=name,title`,
        { headers: { Authorization: `Bearer ${tokenData.access_token}` } }
      )
      const locData = await locRes.json()
      locationId = locData.locations?.[0]?.name || null
      locationName = locData.locations?.[0]?.title || null
    }

    // 3. Store the connection
    await supabaseAdmin.from('client_google_accounts').delete().eq('client_id', client.id)
    await supabaseAdmin.from('client_google_accounts').insert({
      client_id: client.id,
      google_account_id: googleAccountId,
      location_id: locationId,
      location_name: locationName,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token || null,
      connected_at: new Date().toISOString(),
    })

    return NextResponse.redirect(`${REDIRECT_BASE}?google_connect=success`)
  } catch (err) {
    console.error('Google OAuth callback error:', err)
    return NextResponse.redirect(`${REDIRECT_BASE}?google_connect=error`)
  }
}
