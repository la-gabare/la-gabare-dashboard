import { NextResponse } from 'next/server'
import { rescoreAll } from '@/lib/prospection/db'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST() {
  try {
    return NextResponse.json({ ok: true, n: await rescoreAll() })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
