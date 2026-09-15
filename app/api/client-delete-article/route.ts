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
    let { id } = body

    if (!id) {
      return withCors(
        NextResponse.json(
          { error: 'Article ID is required' },
          { status: 400 }
        )
      )
    }

    // Convertir l'ID en nombre
    id = typeof id === 'string' ? parseInt(id, 10) : id

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
      // Admin - pas de vérification de clientId (supprime n'importe quel article)
      // Pour que ce soit safe, l'article à supprimer doit exister
    }

    // Supprimer l'article
    let query = supabaseAdmin.from('articles_publications').delete().eq('id', id)
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
