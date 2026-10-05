import { NextResponse } from 'next/server'
import { DEPT_NAMES, EFF_LABEL, OFFERS, STATUSES, STATUS_PROBA, ZONES } from '@/lib/prospection/constants'
import { getSettings } from '@/lib/prospection/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    return NextResponse.json({
      offers: OFFERS, statuses: STATUSES, zones: ZONES, dept_names: DEPT_NAMES, eff_labels: EFF_LABEL, proba: STATUS_PROBA,
      settings: await getSettings(), year: new Date().getFullYear(),
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
