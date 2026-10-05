import { NextRequest, NextResponse } from 'next/server'
import { auditProspect, discoverProspect } from '@/lib/prospection/db'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/** Traite un petit lot (≤ 4 fiches) en parallèle ; l'interface enchaîne les lots (limite de durée des fonctions Vercel). */
export async function POST(req: NextRequest) {
  try {
    const b = await req.json()
    const sirens: string[] = (b.sirens || []).filter((s: string) => /^\d{9}$/.test(s)).slice(0, 4)
    const fn = b.kind === 'audit' ? auditProspect : b.kind === 'discover' ? discoverProspect : null
    if (!fn) return NextResponse.json({ error: 'kind invalide' }, { status: 400 })
    const results = await Promise.allSettled(sirens.map((s) => fn(s)))
    return NextResponse.json({
      done: sirens.length, errors: results.filter((r) => r.status === 'rejected').length,
      found: b.kind === 'discover' ? results.filter((r) => r.status === 'fulfilled' && r.value === 'found').length : undefined,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
