import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
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

    // Supprimer le post
    const { error } = await supabaseAdmin
      .from('posts_clients')
      .delete()
      .eq('id', id)

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
