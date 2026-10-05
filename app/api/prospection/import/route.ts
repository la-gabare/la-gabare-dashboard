import { NextRequest, NextResponse } from 'next/server'
import { DEPT_NAMES } from '@/lib/prospection/constants'
import { upsertIdentity } from '@/lib/prospection/db'
import { fetchSirenePage } from '@/lib/prospection/sirene'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const ALLOWED_NAF = new Set(['01.21Z', '11.02A', '11.02B'])

/** Importe quelques pages SIRENE d'un département ; l'interface rappelle la route avec `next` jusqu'à la fin. */
export async function POST(req: NextRequest) {
  try {
    const b = await req.json()
    const dept = String(b.dept || '')
    if (!(dept in DEPT_NAMES)) return NextResponse.json({ error: 'Département non pris en charge' }, { status: 400 })
    const nafs = String(b.nafs || '01.21Z,11.02A,11.02B').split(',').filter((n) => ALLOWED_NAF.has(n)).join(',')
    if (!nafs) return NextResponse.json({ error: 'Code NAF invalide' }, { status: 400 })
    let page = Math.max(1, parseInt(b.page || '1', 10))
    const t0 = Date.now()
    let saved = 0
    let totalPages = 1
    let totalResults = 0
    while (page <= totalPages && Date.now() - t0 < 35000) {
      const r = await fetchSirenePage(dept, nafs, !!b.employerOnly, page)
      totalPages = r.totalPages
      totalResults = r.totalResults
      saved += await upsertIdentity(r.rows)
      page++
      await new Promise((res) => setTimeout(res, 150))
    }
    return NextResponse.json({ saved, totalPages, totalResults, next: page <= totalPages ? page : null })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
