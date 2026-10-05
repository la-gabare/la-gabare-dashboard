import { NextResponse } from 'next/server'
import { messageFor } from '@/lib/prospection/db'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: { siren: string } }) {
  try {
    const m = await messageFor(params.siren)
    return m ? NextResponse.json(m) : NextResponse.json({ error: 'introuvable' }, { status: 404 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
