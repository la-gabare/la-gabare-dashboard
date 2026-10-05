import { NextRequest, NextResponse } from 'next/server'
import { getSettings, saveSettings } from '@/lib/prospection/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json(await getSettings())
}

export async function POST(req: NextRequest) {
  try {
    return NextResponse.json(await saveSettings(await req.json()))
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
