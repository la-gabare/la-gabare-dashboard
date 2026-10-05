import { NextRequest, NextResponse } from 'next/server'
import { auditProspect, confirmNoSite, discoverProspect, getProspect, logActivity, savePsi, updateProspect } from '@/lib/prospection/db'
import { runPsi } from '@/lib/prospection/audit'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(req: NextRequest, { params }: { params: { siren: string; action: string } }) {
  const { siren, action } = params
  if (!/^\d{9}$/.test(siren)) return NextResponse.json({ error: 'SIREN invalide' }, { status: 400 })
  try {
    const body = await req.json().catch(() => ({}))
    if (action === 'audit') {
      await auditProspect(siren)
      return NextResponse.json(await getProspect(siren))
    }
    if (action === 'discover') {
      const r = await discoverProspect(siren)
      return NextResponse.json({ ...(await getProspect(siren)), _discover: r })
    }
    if (action === 'nosite') return NextResponse.json(await confirmNoSite(siren))
    if (action === 'note') {
      const kind = ['note', 'appel', 'email', 'rdv'].includes(body.kind) ? body.kind : 'note'
      await logActivity(siren, kind, String(body.text || '').slice(0, 2000))
      if (['email', 'appel', 'rdv'].includes(kind)) await updateProspect(siren, { last_contact: new Date().toISOString().slice(0, 10) })
      return NextResponse.json(await getProspect(siren))
    }
    if (action === 'psi') {
      const cur = await getProspect(siren)
      if (!cur?.url) return NextResponse.json({ ...cur, _error: 'Aucune URL' })
      try {
        await savePsi(siren, await runPsi(cur.url))
      } catch (e: any) {
        return NextResponse.json({ ...(await getProspect(siren)), _error: e.message })
      }
      return NextResponse.json(await getProspect(siren))
    }
    return NextResponse.json({ error: 'action inconnue' }, { status: 404 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
