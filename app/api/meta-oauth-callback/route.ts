import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

const GRAPH = 'https://graph.facebook.com/v21.0'
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

  const appId = process.env.META_APP_ID
  const appSecret = process.env.META_APP_SECRET

  try {
    // 1. Exchange the authorization code for a short-lived user token
    const tokenRes = await fetch(
      `${GRAPH}/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&client_secret=${appSecret}&code=${code}`
    )
    const tokenData = await tokenRes.json()
    if (!tokenData.access_token) {
      throw new Error(tokenData.error?.message || 'No access token returned')
    }

    // 2. Exchange for a long-lived token (~60 days)
    const longRes = await fetch(
      `${GRAPH}/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${tokenData.access_token}`
    )
    const longData = await longRes.json()
    const userToken = longData.access_token || tokenData.access_token

    // 3. Get the Facebook Pages this user manages
    const pagesRes = await fetch(`${GRAPH}/me/accounts?access_token=${userToken}`)
    const pagesData = await pagesRes.json()
    const page = pagesData.data?.[0]
    if (!page) {
      throw new Error('Aucune page Facebook trouvée pour ce compte')
    }

    // 4. Get the Instagram Business Account linked to that page
    const igRes = await fetch(
      `${GRAPH}/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`
    )
    const igData = await igRes.json()

    // 5. Store the connection (page access token is used for both FB and IG publishing)
    await supabaseAdmin.from('client_social_accounts').delete().eq('client_id', client.id)
    await supabaseAdmin.from('client_social_accounts').insert({
      client_id: client.id,
      facebook_page_id: page.id,
      facebook_page_name: page.name,
      instagram_business_account_id: igData.instagram_business_account?.id || null,
      access_token: page.access_token,
      connected_at: new Date().toISOString(),
    })

    return NextResponse.redirect(`${REDIRECT_BASE}?social_connect=success`)
  } catch (err) {
    console.error('Meta OAuth callback error:', err)
    return NextResponse.redirect(`${REDIRECT_BASE}?social_connect=error`)
  }
}
