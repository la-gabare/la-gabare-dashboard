import { NextRequest, NextResponse } from 'next/server'
import { listProspects } from '@/lib/prospection/db'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function GET(req: NextRequest) {
  try {
    return NextResponse.json(await listProspects(new URL(req.url).searchParams))
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
