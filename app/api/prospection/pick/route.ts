import { NextRequest, NextResponse } from 'next/server'
import { pickSirens } from '@/lib/prospection/db'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const b = await req.json()
    const mode = b.mode === 'has_url' ? 'has_url' : 'no_url'
    const sirens = await pickSirens(mode, Math.min(parseInt(b.limit || '50', 10), 2000), b.filters || {})
    return NextResponse.json({ sirens })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
