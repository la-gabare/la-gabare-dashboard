import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function getClientFromRequest(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: 'Missing authorization', status: 401 as const }
  }

  const token = authHeader.slice('Bearer '.length)
  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token)

  if (userError || !userData.user?.email) {
    return { error: 'Invalid session', status: 401 as const }
  }

  const { data: client, error: clientError } = await supabaseAdmin
    .from('clients')
    .select('*')
    .eq('email_contact', userData.user.email)
    .single()

  if (clientError || !client) {
    return { error: 'No client linked to this account', status: 404 as const }
  }

  return { client }
}
