import { NextRequest, NextResponse } from 'next/server'
import { bulkUpdate } from '@/lib/prospection/db'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const b = await req.json()
    const sirens: string[] = (b.sirens || []).filter((s: string) => /^\d{9}$/.test(s)).slice(0, 500)
    await bulkUpdate(sirens, { status: b.status, next_action: b.next_action, saved: typeof b.saved === 'boolean' ? b.saved : undefined })
    return NextResponse.json({ ok: true, n: sirens.length })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
