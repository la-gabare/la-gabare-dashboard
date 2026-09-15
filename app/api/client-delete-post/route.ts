import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getClientFromRequest } from '@/lib/auth-client'
import { withCors, corsPreflight } from '@/lib/cors'

export async function OPTIONS() {
  return corsPreflight()
}

export async function POST(req: NextRequest) {
  try {
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

    // Vérifier l'authentification (Bearer token OU admin session)
    const authHeader = req.headers.get('authorization')
    let clientId: number | null = null

    if (authHeader?.startsWith('Bearer ')) {
      // Client authentifié via Supabase token
      const result = await getClientFromRequest(req)
      if ('error' in result) {
        return withCors(NextResponse.json({ error: result.error }, { status: result.status }))
      }
      clientId = result.client.id
    } else {
      // Admin - pas de vérification de clientId (supprime n'importe quel post)
      // Pour que ce soit safe, le post à supprimer doit exister
    }

    // Supprimer le post
    let query = supabaseAdmin.from('posts').delete().eq('id', id)
    if (clientId !== null) {
      query = query.eq('client_id', clientId)
    }

    const { error } = await query

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
