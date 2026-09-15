import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { article_id } = body

    if (!article_id) {
      return NextResponse.json({ error: 'article_id required' }, { status: 400 })
    }

    // Get article from articles_publications
    const { data: article, error: fetchError } = await supabaseAdmin
      .from('articles_publications')
      .select('*')
      .eq('id', article_id)
      .single()

    if (fetchError || !article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 })
    }

    // Update status to 'publie'
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('articles_publications')
      .update({ statut: 'publie', date_publication: new Date().toISOString() })
      .eq('id', article_id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, article: updated })
  } catch (err) {
    return NextResponse.json({
      error: `Server error: ${err instanceof Error ? err.message : 'Unknown'}`
    }, { status: 500 })
  }
}
