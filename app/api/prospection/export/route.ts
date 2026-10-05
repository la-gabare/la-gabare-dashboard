import { NextRequest, NextResponse } from 'next/server'
import { exportCsv } from '@/lib/prospection/db'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(req: NextRequest) {
  try {
    const csv = await exportCsv(new URL(req.url).searchParams)
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="prospects-gabare-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
