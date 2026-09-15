import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getClientFromRequest } from '@/lib/auth-client'
import { withCors, corsPreflight } from '@/lib/cors'

export async function OPTIONS() {
  return corsPreflight()
}

export async function POST(req: NextRequest) {
  try {
    const result = await getClientFromRequest(req)
    if ('error' in result) {
      return withCors(NextResponse.json({ error: result.error }, { status: result.status }))
    }

    const { client } = result
    const body = await req.json()
    const { id } = body

    if (!id) {
      return withCors(
        NextResponse.json(
          { error: 'Post ID is required' },
          { status: 400 }
        )
      )
    }

    // Supprimer le post (vérifier que c'est du client)
    const { error } = await supabaseAdmin
      .from('posts')
      .delete()
      .eq('id', id)
      .eq('client_id', client.id)

    if (error) {
      return withCors(
        NextResponse.json({ error: error.message }, { status: 400 })
      )
    }

    return withCors(
      NextResponse.json({ success: true })
    )
  } catch (err) {
    return withCors(
      NextResponse.json(
        { error: 'Server error' },
        { status: 500 }
      )
    )
  }
}
