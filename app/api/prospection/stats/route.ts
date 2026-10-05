import { NextResponse } from 'next/server'
import { computeStats } from '@/lib/prospection/db'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function GET() {
  try {
    return NextResponse.json(await computeStats())
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
