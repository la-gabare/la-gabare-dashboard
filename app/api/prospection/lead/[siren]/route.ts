import { NextRequest, NextResponse } from 'next/server'
import { getProspect, updateProspect } from '@/lib/prospection/db'

export const dynamic = 'force-dynamic'

const valid = (s: string) => /^\d{9}$/.test(s)

export async function GET(_req: NextRequest, { params }: { params: { siren: string } }) {
  if (!valid(params.siren)) return NextResponse.json({ error: 'SIREN invalide' }, { status: 400 })
  try {
    const d = await getProspect(params.siren)
    return d ? NextResponse.json(d) : NextResponse.json({ error: 'introuvable' }, { status: 404 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: { siren: string } }) {
  if (!valid(params.siren)) return NextResponse.json({ error: 'SIREN invalide' }, { status: 400 })
  try {
    const d = await updateProspect(params.siren, await req.json())
    return d ? NextResponse.json(d) : NextResponse.json({ error: 'introuvable' }, { status: 404 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
