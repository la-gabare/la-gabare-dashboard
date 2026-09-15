import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { withCors, corsPreflight } from '@/lib/cors'

export async function OPTIONS() {
  return corsPreflight()
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { article_id } = body

    if (!article_id) {
      return withCors(NextResponse.json({ error: 'article_id required' }, { status: 400 }))
    }

    // Get article from articles table
    const { data: article, error: fetchError } = await supabaseAdmin
      .from('articles')
      .select('*')
      .eq('id', article_id)
      .single()

    if (fetchError || !article) {
      console.error('Fetch article error:', fetchError)
      return withCors(NextResponse.json({ error: 'Article not found', details: fetchError }, { status: 404 }))
    }

    // Update status to 'publie' and set publication date
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('articles')
      .update({ status: 'publie', date_publication: new Date().toISOString() })
      .eq('id', article_id)
      .select()
      .single()

    if (updateError) {
      console.error('Publish article error:', updateError)
      return withCors(NextResponse.json({ error: updateError.message, details: updateError }, { status: 400 }))
    }

    return withCors(NextResponse.json({ success: true, article: updated }))
  } catch (err) {
    return withCors(NextResponse.json({
      error: `Server error: ${err instanceof Error ? err.message : 'Unknown'}`
    }, { status: 500 }))
  }
}
